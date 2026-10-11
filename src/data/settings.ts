import type { Settings } from '../domain/types'
import { nowIso } from '../domain/ids'
import { db } from './db'

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  currency: 'PLN',
  vintedCountry: 'pl',
  listingLanguage: 'pl',
  nudgeDays: { stage1: 30, stage2: 60, stage3: 90 },
  targetCpw: {},
  coolingOff: true,
  reminder: { enabled: false, time: '20:00' },
  onboarded: false,
  updatedAt: '1970-01-01T00:00:00.000Z',
}

/** Merge stored settings over defaults, so fields added in later versions always have a value. */
export function withDefaults(stored?: Partial<Settings>): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    id: 'settings',
    nudgeDays: { ...DEFAULT_SETTINGS.nudgeDays, ...stored?.nudgeDays },
    reminder: { ...DEFAULT_SETTINGS.reminder, ...stored?.reminder },
    targetCpw: { ...stored?.targetCpw },
  }
}

export async function getSettings(): Promise<Settings> {
  return withDefaults(await db.settings.get('settings'))
}

export async function updateSettings(patch: Partial<Omit<Settings, 'id' | 'updatedAt'>>): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const current = await getSettings()
    await db.settings.put({ ...current, ...patch, id: 'settings', updatedAt: nowIso() })
  })
}
