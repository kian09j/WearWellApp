// Reminders normally wait weeks (the backup reminder) or only appear on iPhone Safari (the
// Home Screen tip). To try them on a phone, open a Vercel preview or the dev server with
// ?test-reminders: they show straight away for the rest of that visit. The live site ignores it.

const KEY = 'wearwell-test-reminders'

export function testingReminders(): boolean {
  if (!import.meta.env.DEV && !__PREVIEW_BUILD__) return false
  try {
    if (new URLSearchParams(location.search).has('test-reminders')) sessionStorage.setItem(KEY, '1')
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}
