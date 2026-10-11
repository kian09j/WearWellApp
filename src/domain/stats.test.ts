import { describe, expect, it } from 'vitest'
import type { Item, Season } from './types'
import { bestCpw, colourBreakdown, highestCpw, leastWorn, mostWorn, wardrobeValue, wornShare } from './stats'
import { buildWearIndex } from './wearStats'

const TODAY = '2026-10-11'
const pln = (amount: number) => ({ amount, currency: 'PLN' as const })

function piece(id: string, partial: Partial<Item> = {}, seasons: Season[] = []): Item {
  return {
    id,
    name: id,
    createdAt: '2026-01-01T12:00:00.000Z',
    updatedAt: '2026-01-01T12:00:00.000Z',
    kind: 'owned',
    category: 'tshirts',
    seasons,
    status: 'active',
    favourite: false,
    placeholder: false,
    sample: false,
    ...partial,
  }
}

const items = [
  piece('jeans', { price: pln(400), colour: 'blue' }),
  piece('tee', { price: pln(60), colour: 'white' }),
  piece('coat', { price: pln(900), colour: 'beige' }, ['autumn', 'winter']),
  piece('dress', { price: pln(300), colour: 'beige' }, ['summer']),
  piece('skirt', { price: pln(190), colour: 'green' }),
  piece('hoodie', { colour: 'grey' }),
  piece('party', { price: pln(180), status: 'occasion' }),
  piece('stored', { price: pln(999), colour: 'black', status: 'archived' }),
  piece('sold', { price: pln(999), colour: 'black', status: 'sold' }),
  piece('wish', { price: pln(999), colour: 'black', kind: 'wishlist' }),
  piece('eur', { price: { amount: 100, currency: 'EUR' }, colour: 'blue' }),
]

const log = (id: string, ...dates: string[]) => dates.map((date) => ({ itemId: id, date }))
const wears = buildWearIndex([
  ...log('jeans', '2026-10-01', '2026-10-05', '2026-10-09', '2026-10-10'),
  ...log('tee', '2026-09-01', '2026-10-02', '2026-10-08'),
  ...log('coat', '2026-10-10'),
  ...log('dress', '2026-06-20'),
  ...log('hoodie', '2026-10-03', '2026-10-04'),
  ...log('sold', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05'),
  ...log('eur', '2026-10-01'),
])

describe('stats', () => {
  it('ranks the most worn pieces still in the wardrobe', () => {
    expect(mostWorn(items, wears, 3).map((r) => [r.item.id, r.wears])).toEqual([
      ['jeans', 4],
      ['tee', 3],
      ['hoodie', 2],
    ])
  })

  it('lists in-season pieces in rotation with the fewest wears, never-worn first', () => {
    expect(leastWorn(items, wears, TODAY, 3).map((r) => r.item.id)).toEqual(['skirt', 'eur', 'coat']) // one wear each: the longer-ago wear first
    expect(leastWorn(items, wears, TODAY, 10).some((r) => r.item.id === 'dress')).toBe(false) // out of season
  })

  it('finds the best and highest cost per wear in one currency', () => {
    expect(bestCpw(items, wears, 'PLN').map((r) => [r.item.id, r.cpw])).toEqual([
      ['tee', 20],
      ['jeans', 100],
      ['dress', 300],
    ])
    expect(highestCpw(items, wears, 'PLN', 2).map((r) => r.item.id)).toEqual(['coat', 'dress'])
  })

  it('counts colours across the wardrobe, pieces without a colour last', () => {
    expect(colourBreakdown(items)).toEqual([
      { colour: 'beige', count: 2 },
      { colour: 'blue', count: 2 },
      { colour: 'green', count: 1 },
      { colour: 'grey', count: 1 },
      { colour: 'white', count: 1 },
      { colour: 'none', count: 1 },
    ])
  })

  it('adds up what the wardrobe cost, per currency', () => {
    expect(wardrobeValue(items)).toEqual([
      { currency: 'PLN', amount: 2030, priced: 6 },
      { currency: 'EUR', amount: 100, priced: 1 },
    ])
  })

  it('works out the share of the wardrobe worn in the last 90 days', () => {
    // 8 pieces in the wardrobe; worn since 13 July: jeans, tee, coat, hoodie, eur
    expect(wornShare(items, wears, TODAY)).toEqual({ worn: 5, total: 8, ratio: 5 / 8 })
    expect(wornShare([], wears, TODAY).ratio).toBe(0)
  })
})
