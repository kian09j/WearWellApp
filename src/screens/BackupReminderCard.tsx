import { useState } from 'react'
import { Download } from 'lucide-react'
import type { DateKey, Settings } from '../domain/types'
import { backupSnoozeUntil } from '../domain/backupReminder'
import { toDateKey } from '../domain/dates'
import { updateSettings } from '../data'
import { formatDate, t } from '../i18n'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'
import { useSaveBackup } from './useSaveBackup'

const textButton = 'min-h-11 rounded-full px-3 text-[14px] font-semibold text-ink/75 hover:bg-card/60'

/** A gentle reminder to save a backup file, since the wardrobe lives only on this device. */
export function BackupReminderCard({ settings, today }: { settings: Settings; today: DateKey }) {
  const saveBackup = useSaveBackup()
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const last = settings.lastBackupAt

  const save = async () => {
    setSaving(true)
    try {
      await saveBackup()
    } finally {
      setSaving(false)
    }
  }

  const later = async () => {
    const before = settings.backupReminderSnoozedUntil
    await updateSettings({ backupReminderSnoozedUntil: backupSnoozeUntil(today) })
    toast(t('backupReminder.snoozed'), { label: t('common.undo'), onClick: () => void updateSettings({ backupReminderSnoozedUntil: before }) })
  }

  return (
    <section className="rounded-[24px] bg-tint-mieta p-4" aria-labelledby="backup-reminder">
      <div className="flex gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card text-ink/70" aria-hidden="true">
          <Download size={22} />
        </span>
        <div className="min-w-0">
          <p className="label-caps">{t('backupReminder.eyebrow')}</p>
          <h2 id="backup-reminder" className="mt-0.5 text-[1.25rem] leading-tight">
            {last ? t('backupReminder.titleAgain') : t('backupReminder.titleFirst')}
          </h2>
          <p className="mt-1 text-[14px] leading-snug text-ink/75">
            {last ? t('backupReminder.bodyAgain', { date: formatDate(toDateKey(new Date(last)), 'medium') }) : t('backupReminder.bodyFirst')}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1">
        <Button className="min-h-11 flex-1 px-4" disabled={saving} onClick={() => void save()}>
          {t('backupReminder.save')}
        </Button>
        <button type="button" className={textButton} onClick={() => void later()}>
          {t('backupReminder.later')}
        </button>
      </div>
    </section>
  )
}
