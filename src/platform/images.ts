import { fitWithin, MAX_PHOTO_SIZE } from '../domain/imageSize'
import type { NewPhoto } from '../data'

export class ImageError extends Error {}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  try {
    // honours the EXIF rotation of phone photos
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return img
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

/**
 * Shrink a camera photo or screenshot to at most 800px and re-encode it as WebP (JPEG where
 * the browser cannot write WebP, e.g. Safari). Re-encoding also drops EXIF data such as the
 * GPS location a phone camera embeds.
 */
export async function processImage(file: Blob, max = MAX_PHOTO_SIZE): Promise<NewPhoto> {
  let source: ImageBitmap | HTMLImageElement
  try {
    source = await decode(file)
  } catch {
    throw new ImageError('Unreadable image')
  }
  const { width, height } = fitWithin(source.width, source.height, max)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new ImageError('No canvas')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, width, height)
  if ('close' in source) source.close()

  let blob = await toBlob(canvas, 'image/webp', 0.82)
  if (!blob || blob.type !== 'image/webp') {
    // JPEG has no transparency: put product shots with a transparent background on white
    ctx.globalCompositeOperation = 'destination-over'
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    blob = await toBlob(canvas, 'image/jpeg', 0.85)
  }
  if (!blob) throw new ImageError('Could not encode')
  return { bytes: await blob.arrayBuffer(), type: blob.type, width, height }
}
