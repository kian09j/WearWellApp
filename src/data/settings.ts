import type { Settings } from '../domain/types'
import { nowIso } from '../domain/ids'
import { db } from './db'

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  currency: 'PLN',
  vintedCountry: 'pl',
  listingLanguage: 'pl',
  nudgesEnabled: true,
  nudgeDays: { stage1: 30, stage2: 60, stage3: 90 },
  targetCpw: {},
  coolingOff: true,
  reminder: { enabled: false, time: '20:00' },
  onboarded: false,
  updatedAt: '1970-01-01T00:00:00.000Z',
  prefsUpdatedAt: '1970-01-01T00:00:00.000Z',
}

/**
 * The settings a future sync would carry to the person's other devices (docs/sync-plan.md).
 * The rest belong to one device: its id, consent, reminder, onboarding and daily card state.
 */
export const SYNCED_SETTINGS = [
  'currency',
  'vintedCountry',
  'listingLanguage',
  'nudgesEnabled',
  'nudgeDays',
  'targetCpw',
  'coolingOff',
] as const satisfies readonly (keyof Settings)[]

/** Merge stored settings over defaults, so fields added in later versions always have a value. */
export function withDefaults(stored?: Partial<Settings>): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    id: 'settings',
    nudgeDays: { ...DEFAULT_SETTINGS.nudgeDays, ...stored?.nudgeDays },
    reminder: { ...DEFAULT_SETTINGS.reminder, ...stored?.reminder },
    targetCpw: { ...stored?.targetCpw },
    // settings saved before this field existed: their last change is the best guess
    prefsUpdatedAt: stored?.prefsUpdatedAt ?? stored?.updatedAt ?? DEFAULT_SETTINGS.prefsUpdatedAt,
  }
}

export async function getSettings(): Promise<Settings> {
  return withDefaults(await db.settings.get('settings'))
}

export async function updateSettings(patch: Partial<Omit<Settings, 'id' | 'updatedAt' | 'prefsUpdatedAt'>>): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const current = await getSettings()
    const now = nowIso()
    const next: Settings = { ...current, ...patch, id: 'settings', updatedAt: now }
    if (SYNCED_SETTINGS.some((key) => JSON.stringify(next[key]) !== JSON.stringify(current[key]))) next.prefsUpdatedAt = now
    await db.settings.put(next)
  })
}
