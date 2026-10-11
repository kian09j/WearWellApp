import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { addItem } from './items'
import { listWears, logWear, unlogWear } from './wears'

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
    expect(await listWears()).toHaveLength(1)
    expect(await db.wears.count()).toBe(1)
  })
})
