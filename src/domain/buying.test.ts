import { describe, expect, it } from 'vitest'
import type { Item } from './types'
import { addDays } from './dates'
import { coolingOffState, coolingOffUntil, nearestFrequency, projectedCpw, similarOwned } from './buying'
import { inSeasonUnwornDays, makeUnwornContext } from './unworn'
import { buildWearIndex } from './wearStats'

const TODAY = '2026-10-11'

function piece(id: string, partial: Partial<Item> = {}): Item {
  return {
    id,
    name: id,
    createdAt: '2026-01-01T12:00:00.000Z',
    updatedAt: '2026-01-01T12:00:00.000Z',
    kind: 'owned',
    category: 'knitwear',
    seasons: [],
    status: 'active',
    favourite: false,
    placeholder: false,
    sample: false,
    ...partial,
  }
}

describe('projected cost per wear', () => {
  it('spreads the price over the wears you expect', () => {
    expect(projectedCpw(590, 4, 3)).toBe(49.17)
    expect(projectedCpw(590, 4, 6)).toBe(24.58)
    expect(projectedCpw(590, 4, 12)).toBe(12.29)
    expect(projectedCpw(590, 0, 12)).toBe(590)
  })

  it('maps stored frequencies to the nearest preset', () => {
    expect(nearestFrequency(6)).toBe(4)
    expect(nearestFrequency(7)).toBe(8)
    expect(nearestFrequency(30)).toBe(15)
  })
})

describe('similar pieces already owned', () => {
  const items = [
    piece('black merino', { colour: 'black' }),
    piece('black cardigan', { colour: 'black' }),
    piece('cream jumper', { colour: 'cream' }),
    piece('black tee', { colour: 'black', category: 'tshirts' }),
    piece('black stored', { colour: 'black', status: 'archived' }),
    piece('black sold', { colour: 'black', status: 'sold' }),
    piece('black wish', { colour: 'black', kind: 'wishlist' }),
  ]
  const wears = buildWearIndex([
    { itemId: 'black cardigan', date: '2026-10-01' },
    { itemId: 'black cardigan', date: '2026-10-02' },
  ])

  it('matches category and colour among pieces still in the wardrobe, most worn first', () => {
    expect(similarOwned(items, 'knitwear', 'black', wears).map((i) => i.id)).toEqual(['black cardigan', 'black merino'])
  })

  it('matches the whole category when no colour is chosen', () => {
    expect(similarOwned(items, 'knitwear', undefined, wears)).toHaveLength(3)
    expect(similarOwned(items, 'coats', 'black', wears)).toEqual([])
  })
})

describe('cooling-off', () => {
  it('lasts seven days and counts down', () => {
    const until = coolingOffUntil(TODAY)
    expect(until).toBe('2026-10-18')
    expect(coolingOffState({ wishlist: { wearsPerMonth: 4, coolingOffUntil: until } }, TODAY)).toEqual({ active: true, daysLeft: 7, until })
    expect(coolingOffState({ wishlist: { wearsPerMonth: 4, coolingOffUntil: until } }, '2026-10-17').daysLeft).toBe(1)
  })

  it('is over on the last day, or when it was never set', () => {
    expect(coolingOffState({ wishlist: { wearsPerMonth: 4, coolingOffUntil: '2026-10-11' } }, TODAY).active).toBe(false)
    expect(coolingOffState({ wishlist: { wearsPerMonth: 4 } }, TODAY).active).toBe(false)
  })
})

describe('a wishlist piece bought today', () => {
  it('starts its unworn count on the purchase date, not the day it was wishlisted', () => {
    const daily = Array.from({ length: 120 }, (_, i) => ({ itemId: 'other', date: addDays(TODAY, -120 + i) }))
    const bought = piece('boots', { createdAt: '2026-08-01T10:00:00.000Z', purchaseDate: addDays(TODAY, -5) })
    const ctx = makeUnwornContext(TODAY, daily, [bought])
    expect(inSeasonUnwornDays(bought, undefined, ctx)).toBe(5)
  })
})
