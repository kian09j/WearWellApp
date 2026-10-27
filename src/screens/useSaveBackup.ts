import { backupFileName, createBackup, updateSettings } from '../data'
import { nowIso } from '../domain/ids'
import { t } from '../i18n'
import { saveTextFile } from '../platform/files'
import { useToast } from '../ui/Toast'

/**
 * Save a backup file (a download on the web, the share sheet in the apps) and remember when,
 * for the backup reminder. Resolves to whether it was saved.
 */
export function useSaveBackup(): () => Promise<boolean> {
  const toast = useToast()
  return async () => {
    const backup = await createBackup()
    try {
      await saveTextFile(backupFileName(), JSON.stringify(backup))
    } catch {
      // the share sheet was closed without choosing anywhere to save: nothing to say
      return false
    }
    await updateSettings({ lastBackupAt: nowIso(), backupReminderSnoozedUntil: undefined })
    toast(t('settings.exported'))
    return true
  }
}
