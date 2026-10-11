// A tiny buzz on log, where the device supports it (Android browsers). The native apps
// (step 10) will use the system haptics behind this same function, which covers iPhone too.
export function tapFeedback(): void {
  try {
    navigator.vibrate?.(8)
  } catch {
    // not supported: silent
  }
}
