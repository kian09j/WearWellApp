export const MAX_PHOTO_SIZE = 800

/** Scale so the longest side is at most `max`, keeping the aspect ratio. Never upscales. */
export function fitWithin(width: number, height: number, max = MAX_PHOTO_SIZE): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= max) return { width, height }
  const scale = max / longest
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}
