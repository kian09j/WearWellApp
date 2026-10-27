import { isNative } from './native'

/**
 * True in Safari (or another browser) on an iPhone or iPad when WearWell is not on the Home
 * Screen yet. That is where the browser may clear a website's saved data after a while
 * without a visit; a Home Screen app keeps its own storage.
 */
export function canAddToHomeScreen(): boolean {
  if (isNative()) return false
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true || matchMedia('(display-mode: standalone)').matches
  if (standalone) return false
  const ua = navigator.userAgent
  // iPadOS reports itself as a Mac, but a Mac has no touch screen
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}
