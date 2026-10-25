import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import { WearWellDB } from './db'

describe('database upgrades', () => {
  it('version 2 gives existing wears fixed ids and merges duplicates', async () => {
    const name = 'upgrade-to-v2'
    const v1 = new Dexie(name)
    v1.version(1).stores({
      items: 'id, kind, status, category, updatedAt',
      wears: 'id, itemId, date, [itemId+date], updatedAt',
      outfits: 'id, updatedAt',
      photos: 'id',
      settings: 'id',
    })
    const base = { itemId: 'jeans', sample: false, createdAt: '2026-10-01T08:00:00.000Z' }
    await v1.table('wears').bulkAdd([
      { ...base, id: 'random-1', date: '2026-10-01', updatedAt: '2026-10-01T10:00:00.000Z' },
      { ...base, id: 'random-2', date: '2026-10-02', updatedAt: '2026-10-02T09:00:00.000Z', deletedAt: '2026-10-02T09:00:00.000Z' },
      { ...base, id: 'random-3', date: '2026-10-02', updatedAt: '2026-10-02T08:00:00.000Z', outfitId: 'weekend' },
    ])
    v1.close()

    const db = new WearWellDB(name)
    const wears = await db.wears.orderBy('id').toArray()
    expect(wears.map((w) => [w.id, w.deletedAt, w.outfitId])).toEqual([
      ['jeans:2026-10-01', undefined, undefined],
      ['jeans:2026-10-02', undefined, 'weekend'],
    ])
    db.close()
    await Dexie.delete(name)
  })
})
