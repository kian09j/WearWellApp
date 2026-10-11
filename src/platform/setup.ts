import { App } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import { getSettings } from '../data'
import { t } from '../i18n'
import { isNative } from './native'
import { allowReminders, scheduleDailyReminder } from './reminders'

/** One-time start-up work. Web: register the offline service worker. Apps: native glue. */
export async function setupPlatform(): Promise<void> {
  if (!isNative()) {
    const { registerSW } = await import('virtual:pwa-register')
    registerSW({ immediate: true })
    return
  }

  // dark text on the paper-coloured status bar
  void StatusBar.setStyle({ style: Style.Light }).catch(() => {})
  void StatusBar.setBackgroundColor({ color: '#fbf6ec' }).catch(() => {})

  // Android back button: go back inside the app, leave it from the first screen
  void App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back()
    else void App.exitApp()
  })

  // keep the daily reminder scheduled (survives reinstalls and restores from backup)
  const settings = await getSettings()
  if (settings.reminder.enabled && (await allowReminders())) {
    await scheduleDailyReminder(settings.reminder.time, t('reminder.title'), t('reminder.body'))
  }
}
