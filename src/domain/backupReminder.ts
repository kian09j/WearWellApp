import type { DateKey, Item, Settings } from './types'
import { addDays, daysBetween, toDateKey } from './dates'

// The gentle "save a backup" reminder. The wardrobe lives only on the device, so a backup
// file is the one copy that survives a lost or replaced phone.

export interface BackupRules {
  /** Pieces of their own (not the sample) before a wardrobe is worth reminding about. */
  minPieces: number
  /** Days after the first piece was added before the first reminder. */
  firstAfterDays: number
  /** Days after the last backup before the next reminder. */
  everyDays: number
}

export const BACKUP_RULES: BackupRules = { minPieces: 5, firstAfterDays: 14, everyDays: 30 }
/** For trying the reminder out (preview builds): due at once, and again the day after a backup. */
export const TEST_BACKUP_RULES: BackupRules = { minPieces: 0, firstAfterDays: 0, everyDays: 1 }
/** "Later" hides the reminder for this many days. */
export const BACKUP_SNOOZE_DAYS = 14

type BackupState = Pick<Settings, 'lastBackupAt' | 'backupReminderSnoozedUntil'>

/** Whether to remind the person to save a backup today. `items` are the live ones. */
export function isBackupDue(items: readonly Item[], state: BackupState, today: DateKey, rules = BACKUP_RULES): boolean {
  if (state.backupReminderSnoozedUntil && today < state.backupReminderSnoozedUntil) return false
  const own = items.filter((i) => i.kind === 'owned' && !i.sample)
  if (own.length < rules.minPieces) return false
  if (state.lastBackupAt) return daysBetween(toDateKey(new Date(state.lastBackupAt)), today) >= rules.everyDays
  if (own.length === 0) return rules.firstAfterDays <= 0
  const firstAdded = own.reduce((first, i) => (i.createdAt < first ? i.createdAt : first), own[0]!.createdAt)
  return daysBetween(toDateKey(new Date(firstAdded)), today) >= rules.firstAfterDays
}

export function backupSnoozeUntil(today: DateKey): DateKey {
  return addDays(today, BACKUP_SNOOZE_DAYS)
}
