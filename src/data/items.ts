import type { Item, SyncFields } from '../domain/types'
import { categoryDef } from '../domain/categories'
import { newId, nowIso } from '../domain/ids'
import { alive, db } from './db'

export type NewItem = Pick<Item, 'name' | 'category'> & Partial<Omit<Item, keyof SyncFields>>
export type ItemPatch = Partial<Omit<Item, keyof SyncFields>>

/** Name + category is enough; everything else gets a sensible default. */
export function makeItem(input: NewItem, now = nowIso()): Item {
  return {
    kind: 'owned',
    seasons: [...categoryDef(input.category).defaultSeasons],
    status: 'active',
    favourite: false,
    placeholder: false,
    sample: false,
    ...input,
    name: input.name.trim(),
    id: newId(),
    createdAt: now,
    updatedAt: now,
  }
}

export async function addItem(input: NewItem): Promise<string> {
  const item = makeItem(input)
  await db.items.add(item)
  return item.id
}

export async function addItems(inputs: NewItem[]): Promise<string[]> {
  const now = nowIso()
  const items = inputs.map((i) => makeItem(i, now))
  await db.items.bulkAdd(items)
  return items.map((i) => i.id)
}

export async function updateItem(id: string, patch: ItemPatch): Promise<void> {
  await db.items.update(id, { ...patch, updatedAt: nowIso() })
}

/**
 * Soft delete: the item disappears everywhere but stays as a tombstone for future sync.
 * Its photo is kept for a while so Undo brings everything back; purgeDeletedPhotos cleans up.
 */
export async function deleteItem(id: string): Promise<void> {
  const now = nowIso()
  await db.items.update(id, { deletedAt: now, updatedAt: now })
}

export async function restoreItem(id: string): Promise<void> {
  await db.items.update(id, { deletedAt: undefined, updatedAt: nowIso() })
}

/** Free the space of photos that belong to items deleted more than `days` ago. */
export async function purgeDeletedPhotos(days = 30, now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - days * 86_400_000).toISOString()
  return db.transaction('rw', db.items, db.photos, async () => {
    const stale = await db.items.filter((i) => !!i.deletedAt && i.deletedAt < cutoff && !!i.photoId).toArray()
    for (const item of stale) {
      await db.photos.delete(item.photoId!)
      await db.items.update(item.id, { photoId: undefined, updatedAt: now.toISOString() })
    }
    return stale.length
  })
}

export async function getItem(id: string): Promise<Item | undefined> {
  const item = await db.items.get(id)
  return item && alive(item) ? item : undefined
}

export async function listItems(): Promise<Item[]> {
  return (await db.items.toArray()).filter(alive)
}
