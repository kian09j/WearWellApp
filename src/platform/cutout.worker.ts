// Runs the background-removal model off the main thread, so the screen stays responsive.
// The model is downloaded the first time it is needed and kept in its own small database,
// separate from the wardrobe (backups and "Erase everything" never touch it).
import Dexie, { type EntityTable } from 'dexie'
import * as ort from 'onnxruntime-web/wasm'
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url'
import { CUTOUT_INPUT_SIZE } from '../domain/cutout'
import type { CutoutReply, CutoutRequest } from './backgroundRemoval'

// U²-Net small (Apache 2.0), pinned to one revision so the file can never change under us
const MODEL_URL = 'https://huggingface.co/BritishWerewolf/U-2-Netp/resolve/7112208dbac3a3642496c8d54e2f0f9bb3dc1dc8/onnx/model.onnx'
const MODEL_BYTES = 4_574_000 // for the progress bar when the server sends no length

// one thread: several need cross-origin isolation, which the site does not have
ort.env.wasm.wasmPaths = { wasm: wasmUrl }
ort.env.wasm.numThreads = 1
ort.env.logLevel = 'error' // its optimisation notes are not problems

class ModelDB extends Dexie {
  files!: EntityTable<{ url: string; bytes: ArrayBuffer }, 'url'>

  constructor() {
    super('wearwell-models')
    this.version(1).stores({ files: 'url' })
  }
}

const models = new ModelDB()
let session: Promise<ort.InferenceSession> | undefined

class OfflineError extends Error {}

async function download(onProgress: (fraction: number) => void): Promise<ArrayBuffer> {
  let res: Response
  try {
    res = await fetch(MODEL_URL)
  } catch {
    throw new OfflineError()
  }
  if (!res.ok) throw new Error(`Model download failed: ${res.status}`)
  if (!res.body) return res.arrayBuffer()
  const total = Number(res.headers.get('content-length')) || MODEL_BYTES
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.length
    onProgress(Math.min(loaded / total, 0.99))
  }
  const bytes = new Uint8Array(loaded)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  return bytes.buffer
}

async function loadModel(onProgress: (fraction: number) => void, onPreparing: () => void): Promise<ort.InferenceSession> {
  let bytes = (await models.files.get(MODEL_URL))?.bytes
  if (!bytes) {
    bytes = await download(onProgress)
    // keep it for next time; if storage is full, it simply downloads again
    await models.files.put({ url: MODEL_URL, bytes }).catch(() => undefined)
  }
  // quick normally, but the very first time the browser also has to compile the runtime
  onPreparing()
  return ort.InferenceSession.create(new Uint8Array(bytes), { executionProviders: ['wasm'] })
}

const reply = (message: CutoutReply, transfer: Transferable[] = []) => self.postMessage(message, { transfer })

self.addEventListener('message', async (event: MessageEvent<CutoutRequest>) => {
  const { id, input } = event.data
  try {
    session ??= loadModel(
      (fraction) => reply({ id, type: 'progress', fraction }),
      () => reply({ id, type: 'preparing' }),
    )
    let model: ort.InferenceSession
    try {
      model = await session
    } catch (err) {
      session = undefined // let the next tap try again
      throw err
    }
    reply({ id, type: 'working' })
    const size = CUTOUT_INPUT_SIZE
    const result = await model.run({ [model.inputNames[0]!]: new ort.Tensor('float32', input, [1, 3, size, size]) })
    // the first output is the finished mask; the others are the model's intermediate guesses
    const output = result[model.outputNames[0]!]!
    const mask = new Float32Array(output.data as Float32Array)
    for (const tensor of Object.values(result)) tensor.dispose()
    reply({ id, type: 'done', mask }, [mask.buffer])
  } catch (err) {
    reply({ id, type: 'error', kind: err instanceof OfflineError ? 'offline' : 'failed', message: String(err) })
  }
})
