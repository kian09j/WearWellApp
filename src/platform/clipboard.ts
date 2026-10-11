import { Clipboard } from '@capacitor/clipboard'
import { isNative } from './native'

// Copy text to the clipboard. Falls back to the old select-and-copy trick where the
// Clipboard API is missing or blocked (some browsers, plain-http testing on a phone).
export async function copyText(text: string): Promise<boolean> {
  if (isNative()) {
    try {
      await Clipboard.write({ string: text })
      return true
    } catch {
      return false
    }
  }
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.append(area)
    area.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    area.remove()
    return ok
  }
}
