import type { Settings } from '../domain/types'
import { updateSettings } from '../data'
import { t } from '../i18n'
import { allowReminders, cancelDailyReminder, remindersSupported, scheduleDailyReminder } from '../platform/reminders'
import { useToast } from '../ui/Toast'

/** Daily "log your outfit" reminder: on/off and a time. Native apps only. */
export function ReminderSettings({ settings }: { settings: Settings }) {
  const toast = useToast()
  const { enabled, time } = settings.reminder

  if (!remindersSupported()) {
    return <p className="px-5 py-4 text-[14px] text-muted">{t('settings.reminderWeb')}</p>
  }

  const apply = async (next: { enabled: boolean; time: string }) => {
    if (next.enabled) {
      if (!(await allowReminders())) {
        toast(t('settings.reminderDenied'))
        await updateSettings({ reminder: { ...next, enabled: false } })
        return
      }
      await scheduleDailyReminder(next.time, t('reminder.title'), t('reminder.body'))
      toast(t('settings.reminderOn', { time: next.time }))
    } else {
      await cancelDailyReminder()
      toast(t('settings.reminderOff'))
    }
    await updateSettings({ reminder: next })
  }

  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3 px-5 py-4">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => void apply({ enabled: e.target.checked, time })}
          className="mt-0.5 h-6 w-6 shrink-0 accent-mak"
        />
        <span>
          <span className="block font-semibold">{t('settings.reminderEnable')}</span>
          <span className="block text-[13.5px] text-muted">{t('settings.reminderHint')}</span>
        </span>
      </label>
      {enabled && (
        <label className="flex items-center justify-between gap-3 border-t border-thread px-5 py-3">
          <span className="font-semibold">{t('settings.reminderTime')}</span>
          <input
            type="time"
            value={time}
            onChange={(e) => e.target.value && void apply({ enabled: true, time: e.target.value })}
            className="min-h-11 rounded-xl border-[1.5px] border-ink/15 bg-paper px-3 text-[16px] focus:border-mak focus:outline-none"
          />
        </label>
      )}
    </div>
  )
}
