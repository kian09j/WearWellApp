import { beforeEach, describe, expect, it } from 'vitest'
import { wearId } from '../domain/ids'
import { db } from './db'
import { addItem } from './items'
import { listWears, logMany, logWear, unlogMany, unlogWear } from './wears'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('wear logging', () => {
  it('keeps one wear per item per day', async () => {
    const id = await addItem({ name: 'Jeans', category: 'jeans' })
    await logWear(id, '2026-10-10')
    await logWear(id, '2026-10-10')
    expect(await listWears()).toHaveLength(1)
  })

  it('undo hides the log, and logging again revives it instead of duplicating', async () => {
    const id = await addItem({ name: 'Jeans', category: 'jeans' })
    const first = await logWear(id, '2026-10-10')
    await unlogWear(id, '2026-10-10')
    expect(await listWears()).toHaveLength(0)
    const again = await logWear(id, '2026-10-10')
    expect(again).toBe(first)
    expect(first).toBe(wearId(id, '2026-10-10')) // the same id on every device
    expect(await listWears()).toHaveLength(1)
    expect(await db.wears.count()).toBe(1)
  })

  it('logs an outfit at once, and Undo removes only what the outfit added', async () => {
    const jeans = await addItem({ name: 'Jeans', category: 'jeans' })
    const tee = await addItem({ name: 'Tee', category: 'tshirts' })
    const shoes = await addItem({ name: 'Shoes', category: 'shoes' })
    await logWear(jeans, '2026-10-10') // already logged before the outfit

    const added = await logMany([jeans, tee, shoes], '2026-10-10', 'outfit-1')
    expect(added.sort()).toEqual([tee, shoes].sort())
    const logs = await listWears()
    expect(logs).toHaveLength(3)
    expect(logs.every((w) => w.outfitId === 'outfit-1')).toBe(true)

    await unlogMany(added, '2026-10-10')
    expect((await listWears()).map((w) => w.itemId)).toEqual([jeans])
  })
})
