import { describe, expect, it } from 'vitest'
import type { Item } from './types'
import { backupSnoozeUntil, isBackupDue, TEST_BACKUP_RULES } from './backupReminder'

const piece = (n: number, createdAt: string, extra: Partial<Item> = {}): Item => ({
  id: `p${n}`,
  kind: 'owned',
  name: `Piece ${n}`,
  category: 'tshirts',
  seasons: [],
  status: 'active',
  favourite: false,
  placeholder: false,
  sample: false,
  createdAt,
  updatedAt: createdAt,
  ...extra,
})

const wardrobe = (count: number, createdAt = '2026-10-01T10:00:00.000Z', extra: Partial<Item> = {}) =>
  Array.from({ length: count }, (_, n) => piece(n, createdAt, extra))

describe('backup reminder', () => {
  it('first reminds two weeks after the first piece, once there are five of your own', () => {
    expect(isBackupDue(wardrobe(5), {}, '2026-10-14')).toBe(false)
    expect(isBackupDue(wardrobe(5), {}, '2026-10-15')).toBe(true)
    expect(isBackupDue(wardrobe(4), {}, '2026-12-01')).toBe(false)
  })

  it('does not count the sample wardrobe or wishlist pieces', () => {
    expect(isBackupDue(wardrobe(10, undefined, { sample: true }), {}, '2026-12-01')).toBe(false)
    expect(isBackupDue(wardrobe(10, undefined, { kind: 'wishlist' }), {}, '2026-12-01')).toBe(false)
  })

  it('after a backup, reminds again 30 days later', () => {
    const state = { lastBackupAt: '2026-10-20T18:00:00.000Z' }
    expect(isBackupDue(wardrobe(5), state, '2026-11-18')).toBe(false)
    expect(isBackupDue(wardrobe(5), state, '2026-11-19')).toBe(true)
  })

  it('in test mode is due at once, but still goes away after a backup or "Later"', () => {
    expect(isBackupDue([], {}, '2026-10-25', TEST_BACKUP_RULES)).toBe(true)
    expect(isBackupDue([], { lastBackupAt: '2026-10-25T09:00:00.000Z' }, '2026-10-25', TEST_BACKUP_RULES)).toBe(false)
    expect(isBackupDue([], { backupReminderSnoozedUntil: '2026-11-08' }, '2026-10-25', TEST_BACKUP_RULES)).toBe(false)
  })

  it('stays quiet while snoozed with "Later"', () => {
    const state = { backupReminderSnoozedUntil: backupSnoozeUntil('2026-10-20') }
    expect(state.backupReminderSnoozedUntil).toBe('2026-11-03')
    expect(isBackupDue(wardrobe(5), state, '2026-11-02')).toBe(false)
    expect(isBackupDue(wardrobe(5), state, '2026-11-03')).toBe(true)
  })
})
