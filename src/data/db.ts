import Dexie, { type EntityTable } from 'dexie'
import type { Item, Outfit, Photo, Settings, WearLog } from '../domain/types'

// Only the data layer touches Dexie. Screens use the functions and hooks exported from ./index.

export class WearWellDB extends Dexie {
  items!: EntityTable<Item, 'id'>
  wears!: EntityTable<WearLog, 'id'>
  outfits!: EntityTable<Outfit, 'id'>
  photos!: EntityTable<Photo, 'id'>
  settings!: EntityTable<Settings, 'id'>

  constructor(name = 'wearwell') {
    super(name)
    this.version(1).stores({
      items: 'id, kind, status, category, updatedAt',
      wears: 'id, itemId, date, [itemId+date], updatedAt',
      outfits: 'id, updatedAt',
      photos: 'id',
      settings: 'id',
    })
  }
}

export const db = new WearWellDB()

/** Ask the browser not to evict our data under storage pressure. Harmless if refused. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}

export const alive = <T extends { deletedAt?: string }>(r: T) => !r.deletedAt
