import type { Item, Outfit, Photo, Settings, WearLog } from '../domain/types'
import { isCategoryId } from '../domain/categories'
import { isColourId } from '../domain/colours'
import { isDateKey } from '../domain/dates'
import { isMoney } from '../domain/money'
import { nowIso } from '../domain/ids'
import { alive, db } from './db'
import { withDefaults } from './settings'

// A backup is one JSON file with everything in it, photos as base64. Import validates every
// record first and only then replaces the database in a single transaction, so a bad file
// can never leave the wardrobe half-imported.

export const BACKUP_FORMAT = 1

type SerializedPhoto = Omit<Photo, 'bytes'> & { base64: string }

export interface BackupFile {
  app: 'wearwell'
  format: number
  exportedAt: string
  data: {
    items: Item[]
    wears: WearLog[]
    outfits: Outfit[]
    photos: SerializedPhoto[]
    settings: Settings | null
  }
}

export class BackupError extends Error {}

export function bytesToBase64(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes)
  let binary = ''
  for (let i = 0; i < view.length; i += 0x8000) {
    binary += String.fromCharCode(...view.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

export function base64ToBytes(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const view = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i)
  return view.buffer
}

export async function createBackup(): Promise<BackupFile> {
  return db.transaction('r', [db.items, db.wears, db.outfits, db.photos, db.settings], async () => {
    const [items, wears, outfits, photos, settings] = await Promise.all([
      db.items.toArray(),
      db.wears.toArray(),
      db.outfits.toArray(),
      db.photos.toArray(),
      db.settings.get('settings'),
    ])
    const liveItems = items.filter(alive)
    const liveIds = new Set(liveItems.map((i) => i.id))
    const usedPhotos = new Set(liveItems.map((i) => i.photoId).filter(Boolean))
    return {
      app: 'wearwell',
      format: BACKUP_FORMAT,
      exportedAt: nowIso(),
      data: {
        items: liveItems,
        wears: wears.filter((w) => alive(w) && liveIds.has(w.itemId)),
        outfits: outfits.filter(alive),
        photos: photos
          .filter((p) => usedPhotos.has(p.id))
          .map(({ bytes, ...rest }) => ({ ...rest, base64: bytesToBase64(bytes) })),
        settings: settings ?? null,
      },
    }
  })
}

export function backupFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `wearwell-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`
}

// ---- validation ---------------------------------------------------------------------------

type Raw = Record<string, unknown>

const isObj = (v: unknown): v is Raw => !!v && typeof v === 'object' && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === 'string'
const optStr = (v: unknown) => v === undefined || isStr(v)
const SEASONS = ['spring', 'summer', 'autumn', 'winter']
const STATUSES = ['active', 'occasion', 'sentimental', 'archived', 'listed', 'sold', 'donated']
const CONDITIONS = ['new_with_tags', 'new_no_tags', 'very_good', 'good', 'satisfactory']

function checkSync(r: Raw): boolean {
  return isStr(r.id) && r.id.length > 0 && isStr(r.createdAt) && isStr(r.updatedAt) && optStr(r.deletedAt)
}

function checkItem(r: unknown): r is Item {
  if (!isObj(r) || !checkSync(r)) return false
  return (
    (r.kind === 'owned' || r.kind === 'wishlist') &&
    isStr(r.name) &&
    isCategoryId(r.category) &&
    (r.colour === undefined || isColourId(r.colour)) &&
    Array.isArray(r.seasons) &&
    r.seasons.every((s) => SEASONS.includes(s as string)) &&
    (r.price === undefined || isMoney(r.price)) &&
    (r.purchaseDate === undefined || isDateKey(r.purchaseDate)) &&
    optStr(r.brand) &&
    optStr(r.size) &&
    optStr(r.notes) &&
    optStr(r.photoId) &&
    (r.condition === undefined || CONDITIONS.includes(r.condition as string)) &&
    STATUSES.includes(r.status as string) &&
    typeof r.favourite === 'boolean' &&
    typeof r.placeholder === 'boolean' &&
    typeof r.sample === 'boolean' &&
    (r.sale === undefined || (isObj(r.sale) && isDateKey(r.sale.date) && isMoney(r.sale)))
  )
}

function checkWear(r: unknown): r is WearLog {
  return isObj(r) && checkSync(r) && isStr(r.itemId) && isDateKey(r.date) && optStr(r.outfitId) && typeof r.sample === 'boolean'
}

function checkOutfit(r: unknown): r is Outfit {
  return isObj(r) && checkSync(r) && isStr(r.name) && Array.isArray(r.itemIds) && r.itemIds.every(isStr) && typeof r.sample === 'boolean'
}

function checkPhoto(r: unknown): r is SerializedPhoto {
  return (
    isObj(r) &&
    isStr(r.id) &&
    isStr(r.createdAt) &&
    isStr(r.type) &&
    r.type.startsWith('image/') &&
    typeof r.width === 'number' &&
    typeof r.height === 'number' &&
    isStr(r.base64)
  )
}

/** Parse and validate a backup file. Throws BackupError if anything is off. */
export function parseBackup(text: string): BackupFile {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new BackupError('Not valid JSON')
  }
  if (!isObj(raw) || raw.app !== 'wearwell' || !isObj(raw.data)) throw new BackupError('Not a WearWell backup')
  if (typeof raw.format !== 'number' || raw.format > BACKUP_FORMAT) throw new BackupError('Backup is from a newer version')
  const d = raw.data
  const lists = { items: checkItem, wears: checkWear, outfits: checkOutfit, photos: checkPhoto } as const
  for (const [key, check] of Object.entries(lists)) {
    const list = d[key]
    if (!Array.isArray(list)) throw new BackupError(`Missing ${key}`)
    const bad = list.findIndex((r) => !(check as (r: unknown) => boolean)(r))
    if (bad >= 0) throw new BackupError(`Invalid record in ${key} at position ${bad}`)
  }
  if (d.settings !== null && d.settings !== undefined && !isObj(d.settings)) throw new BackupError('Invalid settings')
  return raw as unknown as BackupFile
}

export function summarizeBackup(backup: BackupFile) {
  return {
    exportedAt: backup.exportedAt,
    items: backup.data.items.filter((i) => i.kind === 'owned').length,
    wears: backup.data.wears.length,
  }
}

/** Replace everything on this device with the backup. All or nothing. */
export async function restoreBackup(backup: BackupFile): Promise<void> {
  const photos: Photo[] = backup.data.photos.map(({ base64, ...rest }) => ({ ...rest, bytes: base64ToBytes(base64) }))
  await db.transaction('rw', [db.items, db.wears, db.outfits, db.photos, db.settings], async () => {
    await Promise.all([db.items.clear(), db.wears.clear(), db.outfits.clear(), db.photos.clear(), db.settings.clear()])
    await db.items.bulkAdd(backup.data.items)
    await db.wears.bulkAdd(backup.data.wears)
    await db.outfits.bulkAdd(backup.data.outfits)
    await db.photos.bulkAdd(photos)
    await db.settings.put({ ...withDefaults(backup.data.settings ?? undefined), onboarded: true })
  })
}

export async function eraseEverything(): Promise<void> {
  await db.transaction('rw', [db.items, db.wears, db.outfits, db.photos, db.settings], async () => {
    await Promise.all([db.items.clear(), db.wears.clear(), db.outfits.clear(), db.photos.clear(), db.settings.clear()])
  })
}
