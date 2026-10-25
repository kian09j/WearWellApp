import type { WearLog } from '../domain/types'
import type { ImportPiece } from '../domain/csvImport'
import { nowIso, wearId } from '../domain/ids'
import { db } from './db'
import { makeItem } from './items'

/** Add imported pieces (and their "last worn" wears) in one transaction. Returns the new ids. */
export async function importPieces(pieces: readonly ImportPiece[]): Promise<string[]> {
  return db.transaction('rw', db.items, db.wears, async () => {
    const now = nowIso()
    const items = pieces.map((p) => makeItem({ ...p.item }, now))
    const wears: WearLog[] = []
    pieces.forEach((p, i) => {
      if (p.lastWorn) wears.push({ id: wearId(items[i]!.id, p.lastWorn), itemId: items[i]!.id, date: p.lastWorn, sample: false, createdAt: now, updatedAt: now })
    })
    await db.items.bulkAdd(items)
    await db.wears.bulkAdd(wears)
    return items.map((i) => i.id)
  })
}

/** Undo an import: the pieces and their wears are marked deleted. */
export async function undoImport(itemIds: readonly string[]): Promise<void> {
  const ids = new Set(itemIds)
  await db.transaction('rw', db.items, db.wears, async () => {
    const now = nowIso()
    await db.items.where('id').anyOf([...ids]).modify({ deletedAt: now, updatedAt: now })
    await db.wears.where('itemId').anyOf([...ids]).modify({ deletedAt: now, updatedAt: now })
  })
}
