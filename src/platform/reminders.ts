import { LocalNotifications } from '@capacitor/local-notifications'
import { isNative } from './native'

// The optional daily "log today's outfit" reminder. Local notifications only: nothing is
// sent anywhere. Available in the iOS and Android apps; browsers can't schedule these reliably.

const REMINDER_ID = 1

export function remindersSupported(): boolean {
  return isNative()
}

/** Ask for permission if needed. Returns whether notifications may be shown. */
export async function allowReminders(): Promise<boolean> {
  if (!isNative()) return false
  let status = await LocalNotifications.checkPermissions()
  if (status.display === 'prompt' || status.display === 'prompt-with-rationale') status = await LocalNotifications.requestPermissions()
  return status.display === 'granted'
}

/** Schedule (or reschedule) the reminder every day at "HH:MM". */
export async function scheduleDailyReminder(time: string, title: string, body: string): Promise<void> {
  if (!isNative()) return
  const [hour, minute] = time.split(':').map(Number)
  await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] })
  await LocalNotifications.schedule({
    notifications: [
      {
        id: REMINDER_ID,
        title,
        body,
        schedule: { on: { hour: hour ?? 20, minute: minute ?? 0 }, repeats: true, allowWhileIdle: true },
      },
    ],
  })
}

export async function cancelDailyReminder(): Promise<void> {
  if (!isNative()) return
  await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] })
}
