// Pure maths for background removal: pixels into the model's input, and the model's output
// into an alpha mask. No DOM and no model here, so it is unit tested.

/** U²-Net small takes a 320 × 320 image and returns a 320 × 320 mask. */
export const CUTOUT_INPUT_SIZE = 320

// ImageNet statistics, which U²-Net was trained with
const MEAN = [0.485, 0.456, 0.406] as const
const STD = [0.229, 0.224, 0.225] as const

/** RGBA pixels (row by row) to the model's input: planar RGB, normalised. The alpha channel is ignored. */
export function toModelInput(rgba: Uint8ClampedArray): Float32Array {
  const n = rgba.length / 4
  const input = new Float32Array(3 * n)
  for (let i = 0; i < n; i++) {
    for (let ch = 0; ch < 3; ch++) {
      input[ch * n + i] = (rgba[i * 4 + ch]! / 255 - MEAN[ch]!) / STD[ch]!
    }
  }
  return input
}

/**
 * The model's raw mask to alpha values 0–255, stretched so the weakest pixel is fully
 * transparent and the strongest fully opaque (U²-Net's output is relative, not absolute).
 * A flat mask means the model found nothing, so everything becomes transparent.
 */
export function toAlpha(mask: Float32Array): Uint8ClampedArray {
  let lo = Infinity
  let hi = -Infinity
  for (const v of mask) {
    if (v < lo) lo = v
    if (v > hi) hi = v
  }
  const alpha = new Uint8ClampedArray(mask.length)
  const range = hi - lo
  if (!(range > 1e-6)) return alpha
  for (let i = 0; i < mask.length; i++) alpha[i] = Math.round(((mask[i]! - lo) / range) * 255)
  return alpha
}

export type CutoutVerdict = 'ok' | 'nothingFound' | 'noBackground'

/**
 * Whether a cutout is worth offering, from the share of mostly opaque pixels: almost none
 * means the piece was not found, almost all means there was no background to remove.
 */
export function judgeCutout(alpha: Uint8ClampedArray): CutoutVerdict {
  if (alpha.length === 0) return 'nothingFound'
  let solid = 0
  for (const a of alpha) if (a >= 128) solid++
  const share = solid / alpha.length
  if (share < 0.02) return 'nothingFound'
  if (share > 0.97) return 'noBackground'
  return 'ok'
}
