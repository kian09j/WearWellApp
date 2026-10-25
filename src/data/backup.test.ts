import { beforeEach, describe, expect, it } from 'vitest'
import type { WearLog } from '../domain/types'
import { wearId } from '../domain/ids'
import { BackupError, createBackup, eraseEverything, parseBackup, restoreBackup } from './backup'
import { db } from './db'
import { addItem, deleteItem, listItems, updateItem } from './items'
import { saveOutfit } from './outfits'
import { getSettings, updateSettings } from './settings'
import { listWears, logWear } from './wears'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

async function seedSmallWardrobe() {
  const jeans = await addItem({ name: 'Jeans', category: 'jeans', price: { amount: 399, currency: 'PLN' } })
  const coat = await addItem({ name: 'Coat', category: 'coats', colour: 'beige' })
  const gone = await addItem({ name: 'Old top', category: 'tshirts' })
  await db.photos.add({
    id: 'p1',
    createdAt: '2026-10-01T10:00:00.000Z',
    bytes: new Uint8Array([1, 2, 3, 250]).buffer,
    type: 'image/webp',
    width: 2,
    height: 2,
  })
  await updateItem(coat, { photoId: 'p1' })
  await logWear(jeans, '2026-10-09')
  await logWear(coat, '2026-10-09')
  await logWear(gone, '2026-10-08')
  await deleteItem(gone)
  await saveOutfit('Autumn', [jeans, coat])
  await updateSettings({ currency: 'EUR', onboarded: true })
}

describe('backup', () => {
  it('round-trips everything, photos included, and leaves deleted items out', async () => {
    await seedSmallWardrobe()
    const json = JSON.stringify(await createBackup())

    await eraseEverything()
    expect(await listItems()).toHaveLength(0)

    await restoreBackup(parseBackup(json))
    const items = await listItems()
    expect(items.map((i) => i.name).sort()).toEqual(['Coat', 'Jeans'])
    expect(await listWears()).toHaveLength(2)
    expect(await db.outfits.count()).toBe(1)
    expect((await getSettings()).currency).toBe('EUR')
    const photo = await db.photos.get('p1')
    expect(Array.from(new Uint8Array(photo!.bytes))).toEqual([1, 2, 3, 250])
  })

  it('gives wears from older backups fixed ids, one per piece and day', async () => {
    await seedSmallWardrobe()
    const backup = await createBackup()
    const [first, second] = backup.data.wears as [WearLog, WearLog]
    backup.data.wears = [
      { ...first, id: 'random-1' },
      { ...first, id: 'random-duplicate', updatedAt: '2020-01-01T00:00:00.000Z' },
      { ...second, id: 'random-2' },
    ]
    await restoreBackup(parseBackup(JSON.stringify(backup)))
    const wears = await listWears()
    expect(wears).toHaveLength(2)
    expect(wears.every((w) => w.id === wearId(w.itemId, w.date))).toBe(true)
  })

  it('rejects files that are not WearWell backups', () => {
    expect(() => parseBackup('not json')).toThrow(BackupError)
    expect(() => parseBackup('{"app":"other","data":{}}')).toThrow(BackupError)
    expect(() => parseBackup('{"app":"wearwell","format":99,"data":{}}')).toThrow(/newer/)
  })

  it('rejects a backup with an invalid record and leaves current data untouched', async () => {
    await seedSmallWardrobe()
    const backup = await createBackup()
    const first = backup.data.items[0] as unknown as Record<string, unknown>
    first.category = 'spaceship'
    expect(() => parseBackup(JSON.stringify(backup))).toThrow(/items/)
    expect(await listItems()).toHaveLength(2)
  })
})
