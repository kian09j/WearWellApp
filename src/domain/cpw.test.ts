import { describe, expect, it } from 'vitest'
import type { Item } from './types'
import { sortItems } from './catalogue'
import { categoryCpw, cpwAfterNextWear, itemCpw, targetProgress, wardrobeCpw, wearsToTarget } from './cpw'
import { buildWearIndex } from './wearStats'

function piece(id: string, partial: Partial<Item> = {}): Item {
  return {
    id,
    name: id,
    createdAt: '2026-01-01T12:00:00.000Z',
    updatedAt: '2026-01-01T12:00:00.000Z',
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

const pln = (amount: number) => ({ amount, currency: 'PLN' as const })
const wearsFor = (counts: Record<string, number>) =>
  buildWearIndex(Object.entries(counts).flatMap(([itemId, n]) => Array.from({ length: n }, (_, i) => ({ itemId, date: `2026-09-${String(i + 1).padStart(2, '0')}` }))))

describe('cost per wear for one piece', () => {
  it('divides the price by the wears, rounded to the grosz', () => {
    expect(itemCpw({ price: pln(349) }, 28)).toEqual({ kind: 'cpw', value: pln(12.46), price: pln(349), wears: 28 })
    expect(itemCpw({ price: pln(100) }, 4)).toMatchObject({ value: pln(25) })
  })

  it('says "not worn yet" and "no price" instead of a number', () => {
    expect(itemCpw({ price: pln(189) }, 0)).toEqual({ kind: 'notWorn', price: pln(189) })
    expect(itemCpw({}, 12)).toEqual({ kind: 'noPrice' })
  })

  it('handles free pieces (a gift entered at 0)', () => {
    expect(itemCpw({ price: pln(0) }, 3)).toMatchObject({ value: pln(0) })
  })

  it('shows what the next wear does', () => {
    expect(cpwAfterNextWear(pln(349), 28)).toEqual(pln(12.03))
    expect(cpwAfterNextWear(pln(189), 0)).toEqual(pln(189))
  })
})

describe('targets', () => {
  it('counts the wears still needed to reach a target', () => {
    expect(wearsToTarget(349, 28, 10)).toBe(7) // needs 35 wears
    expect(wearsToTarget(100, 10, 10)).toBe(0) // exactly on target
    expect(wearsToTarget(100, 12, 10)).toBe(0)
    expect(wearsToTarget(100, 0, 0)).toBe(0) // no target, nothing to chase
  })

  it('reports progress as a share of the wears needed', () => {
    expect(targetProgress(300, 15, 10)).toEqual({ reached: false, ratio: 0.5, wearsNeeded: 15 })
    expect(targetProgress(300, 40, 10)).toEqual({ reached: true, ratio: 1, wearsNeeded: 0 })
  })
})

describe('group averages', () => {
  const items = [
    piece('tee', { price: pln(60) }),
    piece('jeans', { category: 'jeans', price: pln(400) }),
    piece('skirt', { category: 'skirts', price: pln(200) }), // never worn
    piece('hoodie', { category: 'sweatshirts' }), // no price
    piece('coat', { category: 'coats', price: { amount: 200, currency: 'EUR' } }),
    piece('stored', { price: pln(999), status: 'archived' }),
    piece('sold', { price: pln(999), status: 'sold' }),
    piece('wish', { price: pln(999), kind: 'wishlist' }),
    piece('party', { price: pln(150), status: 'occasion' }),
  ]
  const wears = wearsFor({ tee: 20, jeans: 40, hoodie: 30, coat: 10, stored: 1, sold: 1, party: 2 })

  it('averages the whole wardrobe per currency, counting unworn priced pieces, skipping archived, sold and wishlist', () => {
    const groups = wardrobeCpw(items, wears)
    // PLN: (60 + 400 + 200 + 150) / (20 + 40 + 0 + 2)
    expect(groups.get('PLN')).toEqual({ currency: 'PLN', spent: 810, wears: 62, priced: 4, cpw: 13.06 })
    expect(groups.get('EUR')).toEqual({ currency: 'EUR', spent: 200, wears: 10, priced: 1, cpw: 20 })
  })

  it('splits by category for one currency and still counts unpriced pieces as pieces', () => {
    const cats = categoryCpw(items, wears, 'PLN')
    expect(cats.get('tshirts')).toMatchObject({ spent: 210, wears: 22, priced: 2, pieces: 2, cpw: 9.55 })
    expect(cats.get('skirts')).toMatchObject({ spent: 200, wears: 0, priced: 1, pieces: 1 })
    expect(cats.get('skirts')?.cpw).toBeUndefined()
    expect(cats.get('sweatshirts')).toMatchObject({ priced: 0, pieces: 1, wears: 0, totalWears: 30 })
    expect(cats.has('coats')).toBe(false) // priced in EUR only
  })
})

describe('sorting by cost per wear', () => {
  const items = [
    piece('cheap', { price: pln(40) }),
    piece('dear', { price: pln(600) }),
    piece('unworn', { price: pln(150) }),
    piece('gift'),
  ]
  const wears = wearsFor({ cheap: 20, dear: 10, gift: 5 })

  it('lowest first: worn pieces by CPW, then unworn, then no price', () => {
    expect(sortItems(items, 'cpwLow', wears).map((i) => i.id)).toEqual(['cheap', 'dear', 'unworn', 'gift'])
  })

  it('highest first: unworn pieces lead, no price still last', () => {
    expect(sortItems(items, 'cpwHigh', wears).map((i) => i.id)).toEqual(['unworn', 'dear', 'cheap', 'gift'])
  })
})
