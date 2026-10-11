import type { DateKey, WearLog } from '../domain/types'
import { newId, nowIso } from '../domain/ids'
import { alive, db } from './db'

// One wear per item per day. Logging again revives an undone log instead of
// creating a duplicate, which keeps the history clean for a future sync.

export async function logWear(itemId: string, date: DateKey, outfitId?: string): Promise<string> {
  return db.transaction('rw', db.wears, async () => {
    const existing = await db.wears.where('[itemId+date]').equals([itemId, date]).first()
    const now = nowIso()
    if (existing) {
      if (existing.deletedAt || existing.outfitId !== outfitId) {
        await db.wears.update(existing.id, { deletedAt: undefined, outfitId, updatedAt: now })
      }
      return existing.id
    }
    const log: WearLog = { id: newId(), itemId, date, outfitId, sample: false, createdAt: now, updatedAt: now }
    await db.wears.add(log)
    return log.id
  })
}

export async function unlogWear(itemId: string, date: DateKey): Promise<void> {
  await db.transaction('rw', db.wears, async () => {
    const now = nowIso()
    const logs = await db.wears.where('[itemId+date]').equals([itemId, date]).toArray()
    for (const log of logs.filter(alive)) {
      await db.wears.update(log.id, { deletedAt: now, updatedAt: now })
    }
  })
}

/**
 * Log several pieces at once (an outfit, or "same as yesterday"). Returns the pieces that were
 * not yet logged for that day, so Undo removes only what this action added.
 */
export async function logMany(itemIds: readonly string[], date: DateKey, outfitId?: string): Promise<string[]> {
  return db.transaction('rw', db.wears, async () => {
    const before = await db.wears.where('date').equals(date).filter(alive).toArray()
    const already = new Set(before.map((w) => w.itemId))
    for (const id of itemIds) await logWear(id, date, outfitId ?? before.find((w) => w.itemId === id)?.outfitId)
    return itemIds.filter((id) => !already.has(id))
  })
}

export async function unlogMany(itemIds: readonly string[], date: DateKey): Promise<void> {
  await db.transaction('rw', db.wears, async () => {
    for (const id of itemIds) await unlogWear(id, date)
  })
}

export async function listWears(): Promise<WearLog[]> {
  return (await db.wears.toArray()).filter(alive)
}
