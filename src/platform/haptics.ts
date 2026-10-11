import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { isNative } from './native'

/** A tiny buzz when something is logged: system haptics in the apps, vibration on Android web. */
export function tapFeedback(): void {
  try {
    if (isNative()) void Haptics.impact({ style: ImpactStyle.Light })
    else navigator.vibrate?.(8)
  } catch {
    // not supported: silent
  }
}
