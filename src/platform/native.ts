import { Capacitor } from '@capacitor/core'

/** True inside the iOS / Android app, false in a browser (including the installed PWA). */
export function isNative(): boolean {
  return Capacitor.isNativePlatform()
}
