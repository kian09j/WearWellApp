import Dexie, { type EntityTable } from 'dexie'
import type { Item, Outfit, Photo, Settings, WearLog } from '../domain/types'
import { rekeyWears } from '../domain/ids'

// Only the data layer touches Dexie. Screens use the functions and hooks exported from ./index.

export class WearWellDB extends Dexie {
  items!: EntityTable<Item, 'id'>
  wears!: EntityTable<WearLog, 'id'>
  outfits!: EntityTable<Outfit, 'id'>
  photos!: EntityTable<Photo, 'id'>
  settings!: EntityTable<Settings, 'id'>

  constructor(name = 'wearwell') {
    super(name)
    const schema = {
      items: 'id, kind, status, category, updatedAt',
      wears: 'id, itemId, date, [itemId+date], updatedAt',
      outfits: 'id, updatedAt',
      photos: 'id',
      settings: 'id',
    }
    this.version(1).stores(schema)
    // version 2: wears get a fixed id per piece and day (wearId), ready for a future sync
    this.version(2)
      .stores(schema)
      .upgrade(async (tx) => {
        const wears = tx.table<WearLog, string>('wears')
        const rekeyed = rekeyWears(await wears.toArray())
        await wears.clear()
        await wears.bulkAdd(rekeyed)
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
