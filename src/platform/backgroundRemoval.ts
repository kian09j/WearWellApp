import type { NewPhoto } from '../data'
import { CUTOUT_INPUT_SIZE, judgeCutout, toAlpha, toModelInput } from '../domain/cutout'
import { toBlob } from './images'

// Removes the background from a piece's photo, entirely on the device. The model (U²-Net small)
// runs in a worker, cutout.worker.ts; this file does the canvas work on either side of it.

export type CutoutErrorKind = 'offline' | 'nothingFound' | 'noBackground' | 'failed'

export class CutoutError extends Error {
  constructor(readonly kind: CutoutErrorKind) {
    super(kind)
  }
}

/** The model downloads once; "preparing" starts it up each time the app opens (slow only the first time). */
export type CutoutProgress = { stage: 'download'; fraction: number } | { stage: 'preparing' } | { stage: 'working' }

export interface CutoutRequest {
  id: number
  input: Float32Array
}

export type CutoutReply =
  | { id: number; type: 'progress'; fraction: number }
  | { id: number; type: 'preparing' }
  | { id: number; type: 'working' }
  | { id: number; type: 'done'; mask: Float32Array }
  | { id: number; type: 'error'; kind: 'offline' | 'failed'; message: string }

interface Pending {
  resolve: (mask: Float32Array) => void
  reject: (err: Error) => void
  onProgress?: (progress: CutoutProgress) => void
}

let worker: Worker | undefined
let nextId = 1
const pending = new Map<number, Pending>()

function getWorker(): Worker {
  if (worker) return worker
  worker = new Worker(new URL('./cutout.worker.ts', import.meta.url), { type: 'module' })
  worker.addEventListener('message', (event: MessageEvent<CutoutReply>) => {
    const msg = event.data
    const job = pending.get(msg.id)
    if (!job) return
    if (msg.type === 'progress') job.onProgress?.({ stage: 'download', fraction: msg.fraction })
    else if (msg.type === 'preparing' || msg.type === 'working') job.onProgress?.({ stage: msg.type })
    else {
      pending.delete(msg.id)
      if (msg.type === 'done') job.resolve(msg.mask)
      else {
        if (msg.kind === 'failed') console.error(msg.message)
        job.reject(new CutoutError(msg.kind))
      }
    }
  })
  worker.addEventListener('error', (event) => {
    // the worker itself broke (e.g. it could not load): fail what is waiting and start afresh next time
    console.error(event.message)
    for (const job of pending.values()) job.reject(new CutoutError('failed'))
    pending.clear()
    worker?.terminate()
    worker = undefined
  })
  return worker
}

function runModel(input: Float32Array, onProgress?: (progress: CutoutProgress) => void): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const id = nextId++
    pending.set(id, { resolve, reject, onProgress })
    getWorker().postMessage({ id, input } satisfies CutoutRequest, [input.buffer])
  })
}

function canvas(width: number, height: number): CanvasRenderingContext2D {
  const el = document.createElement('canvas')
  el.width = width
  el.height = height
  const ctx = el.getContext('2d')
  if (!ctx) throw new CutoutError('failed')
  return ctx
}

/**
 * The same photo with its background made transparent, as WebP (PNG where the browser
 * cannot write WebP, e.g. Safari, since JPEG has no transparency).
 */
export async function removeBackground(photo: NewPhoto, onProgress?: (progress: CutoutProgress) => void): Promise<NewPhoto> {
  const image = await createImageBitmap(new Blob([photo.bytes], { type: photo.type }))
  try {
    const size = CUTOUT_INPUT_SIZE
    const small = canvas(size, size)
    small.drawImage(image, 0, 0, size, size)
    const mask = await runModel(toModelInput(small.getImageData(0, 0, size, size).data), onProgress)

    const alpha = toAlpha(mask)
    const verdict = judgeCutout(alpha)
    if (verdict !== 'ok') throw new CutoutError(verdict)

    // the mask as a picture whose transparency is the cutout, stretched back to the photo's size
    const maskPixels = new ImageData(size, size)
    for (let i = 0; i < alpha.length; i++) maskPixels.data[i * 4 + 3] = alpha[i]!
    small.putImageData(maskPixels, 0, 0)

    const { width, height } = image
    const out = canvas(width, height)
    out.imageSmoothingQuality = 'high'
    out.drawImage(small.canvas, 0, 0, width, height)
    out.globalCompositeOperation = 'source-in'
    out.drawImage(image, 0, 0)

    let blob = await toBlob(out.canvas, 'image/webp', 0.82)
    if (!blob || blob.type !== 'image/webp') blob = await toBlob(out.canvas, 'image/png', 1)
    if (!blob) throw new CutoutError('failed')
    return { bytes: await blob.arrayBuffer(), type: blob.type, width, height }
  } finally {
    image.close()
  }
}
