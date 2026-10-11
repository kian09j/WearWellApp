// Open a website outside the app (Vinted, polskapicks.com). The native apps (step 10) swap in
// the system browser behind this same function.
export function openExternal(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer')
}
