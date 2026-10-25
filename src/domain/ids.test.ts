import { describe, expect, it } from 'vitest'
import type { WearLog } from './types'
import { rekeyWears, wearId } from './ids'

const wear = (id: string, date: string, updatedAt: string, deletedAt?: string): WearLog => ({
  id,
  itemId: 'jeans',
  date,
  sample: false,
  createdAt: '2026-10-01T08:00:00.000Z',
  updatedAt,
  ...(deletedAt ? { deletedAt } : {}),
})

describe('wear ids', () => {
  it('are the piece and the day, so every device agrees on them', () => {
    expect(wearId('jeans', '2026-10-25')).toBe('jeans:2026-10-25')
  })

  it('re-keys old wears, keeping one per piece and day: live beats undone, then the latest change', () => {
    const rekeyed = rekeyWears([
      wear('a', '2026-10-01', '2026-10-01T10:00:00.000Z'),
      // the same day twice: the live one wins even though the undone one changed later
      wear('b', '2026-10-02', '2026-10-02T09:00:00.000Z', '2026-10-02T09:00:00.000Z'),
      wear('c', '2026-10-02', '2026-10-02T08:00:00.000Z'),
      // two live ones: the later change wins
      wear('d', '2026-10-03', '2026-10-03T08:00:00.000Z'),
      { ...wear('e', '2026-10-03', '2026-10-03T12:00:00.000Z'), outfitId: 'weekend' },
    ])
    expect(rekeyed.map((w) => [w.id, w.updatedAt, w.deletedAt, w.outfitId])).toEqual([
      ['jeans:2026-10-01', '2026-10-01T10:00:00.000Z', undefined, undefined],
      ['jeans:2026-10-02', '2026-10-02T08:00:00.000Z', undefined, undefined],
      ['jeans:2026-10-03', '2026-10-03T12:00:00.000Z', undefined, 'weekend'],
    ])
  })
})
