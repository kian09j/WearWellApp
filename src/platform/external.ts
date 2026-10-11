import { Browser } from '@capacitor/browser'
import { isNative } from './native'

/** Open a website outside the app (Vinted, polskapicks.com): the system browser in the apps. */
export function openExternal(url: string): void {
  if (isNative()) void Browser.open({ url })
  else window.open(url, '_blank', 'noopener,noreferrer')
}
