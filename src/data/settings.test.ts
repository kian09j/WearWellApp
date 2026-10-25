import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from './db'
import { getSettings, updateSettings, withDefaults } from './settings'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  vi.useFakeTimers({ toFake: ['Date'] })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('settings', () => {
  it('only a change to a setting that would sync moves prefsUpdatedAt', async () => {
    vi.setSystemTime(new Date('2026-10-25T09:00:00.000Z'))
    await updateSettings({ currency: 'EUR' })
    expect((await getSettings()).prefsUpdatedAt).toBe('2026-10-25T09:00:00.000Z')

    // per-device changes, and setting a value it already has, leave it alone
    vi.setSystemTime(new Date('2026-10-25T10:00:00.000Z'))
    await updateSettings({ rediscovery: { date: '2026-10-25', skipped: ['jeans'] }, onboarded: true })
    await updateSettings({ currency: 'EUR' })
    const after = await getSettings()
    expect(after.updatedAt).toBe('2026-10-25T10:00:00.000Z')
    expect(after.prefsUpdatedAt).toBe('2026-10-25T09:00:00.000Z')

    vi.setSystemTime(new Date('2026-10-25T11:00:00.000Z'))
    await updateSettings({ nudgeDays: { stage1: 20, stage2: 60, stage3: 90 } })
    expect((await getSettings()).prefsUpdatedAt).toBe('2026-10-25T11:00:00.000Z')
  })

  it('settings saved before prefsUpdatedAt existed take their last change instead', () => {
    expect(withDefaults({ updatedAt: '2026-10-01T10:00:00.000Z' }).prefsUpdatedAt).toBe('2026-10-01T10:00:00.000Z')
  })
})
