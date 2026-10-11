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

/** Soft delete: the item disappears everywhere but stays as a tombstone for future sync. */
export async function deleteItem(id: string): Promise<void> {
  await db.transaction('rw', db.items, db.photos, async () => {
    const item = await db.items.get(id)
    if (!item) return
    const now = nowIso()
    await db.items.update(id, { deletedAt: now, updatedAt: now, photoId: undefined })
    if (item.photoId) await db.photos.delete(item.photoId)
  })
}

export async function getItem(id: string): Promise<Item | undefined> {
  const item = await db.items.get(id)
  return item && alive(item) ? item : undefined
}

export async function listItems(): Promise<Item[]> {
  return (await db.items.toArray()).filter(alive)
}
