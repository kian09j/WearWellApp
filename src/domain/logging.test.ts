import { describe, expect, it } from 'vitest'
import type { Item } from './types'
import { homeGrid, isWearable, sameAsDayBefore, wornOn } from './logging'
import { buildWearIndex } from './wearStats'

let n = 0
function item(partial: Partial<Item> & Pick<Item, 'name'>): Item {
  n++
  return {
    id: partial.name,
    createdAt: `2026-01-${String(n).padStart(2, '0')}T10:00:00.000Z`,
    updatedAt: '2026-01-01T10:00:00.000Z',
    kind: 'owned',
    category: 'tshirts',
    seasons: [],
    status: 'active',
    favourite: false,
    placeholder: false,
    sample: false,
    ...partial,
  }
}

const wears = [
  { itemId: 'jeans', date: '2026-10-10' },
  { itemId: 'tee', date: '2026-10-10' },
  { itemId: 'sold', date: '2026-10-10' },
  { itemId: 'tee', date: '2026-10-11' },
  { itemId: 'coat', date: '2026-10-01' },
]

describe('logging helpers', () => {
  it('only lets you log pieces still in the wardrobe', () => {
    expect(isWearable(item({ name: 'a' }))).toBe(true)
    expect(isWearable(item({ name: 'b', status: 'listed' }))).toBe(true)
    expect(isWearable(item({ name: 'c', status: 'archived' }))).toBe(false)
    expect(isWearable(item({ name: 'd', status: 'sold' }))).toBe(false)
    expect(isWearable(item({ name: 'e', kind: 'wishlist' }))).toBe(false)
  })

  it('finds what was worn on a day', () => {
    expect([...wornOn(wears, '2026-10-10')].sort()).toEqual(['jeans', 'sold', 'tee'])
  })

  it('repeats the day before, skipping pieces that are gone', () => {
    const wearable = new Set(['jeans', 'tee', 'coat'])
    expect(sameAsDayBefore(wears, '2026-10-11', wearable).sort()).toEqual(['jeans', 'tee'])
    expect(sameAsDayBefore(wears, '2026-10-05', wearable)).toEqual([])
  })
})

describe('home grid', () => {
  const index = buildWearIndex(wears)
  const pieces = [
    item({ name: 'coat' }),
    item({ name: 'jeans' }),
    item({ name: 'tee' }),
    item({ name: 'scarf', favourite: true }),
    item({ name: 'new' }),
    item({ name: 'stored', status: 'archived' }),
  ]

  it('puts favourites first, then most recently worn, then newest', () => {
    const { shown, total } = homeGrid(pieces, index, new Set(), 10)
    expect(shown.map((i) => i.id)).toEqual(['scarf', 'tee', 'jeans', 'coat', 'new'])
    expect(total).toBe(5)
  })

  it('always includes pieces already logged that day, even beyond the limit', () => {
    const { shown } = homeGrid(pieces, index, new Set(['new']), 2)
    expect(shown.map((i) => i.id)).toEqual(['scarf', 'tee', 'new'])
  })
})
