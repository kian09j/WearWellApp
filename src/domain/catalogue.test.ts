import { describe, expect, it } from 'vitest'
import type { Item } from './types'
import { filterItems, normalizeSearch, placeholderNames, sortItems } from './catalogue'
import { fitWithin } from './imageSize'
import { buildWearIndex } from './wearStats'

let n = 0
function item(partial: Partial<Item> & Pick<Item, 'name'>): Item {
  n++
  return {
    id: `i${n}`,
    createdAt: `2026-10-0${n}T10:00:00.000Z`,
    updatedAt: `2026-10-0${n}T10:00:00.000Z`,
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

const tee = item({ name: 'White tee', brand: 'COS' })
const coat = item({ name: 'Wool coat', category: 'coats', seasons: ['autumn', 'winter'] })
const skirt = item({ name: 'Żółta spódnica', category: 'skirts', status: 'listed' })
const sold = item({ name: 'Old dress', category: 'dresses', status: 'sold' })
const stored = item({ name: 'Ski jacket', category: 'jackets', status: 'archived' })
const wish = item({ name: 'Wishlist boots', category: 'shoes', kind: 'wishlist' })
const all = [tee, coat, skirt, sold, stored, wish]

describe('catalogue filtering', () => {
  it('shows owned pieces still in the wardrobe, including listed ones, never wishlist', () => {
    expect(filterItems(all, { view: 'wardrobe' }).map((i) => i.name)).toEqual(['White tee', 'Wool coat', 'Żółta spódnica'])
    expect(filterItems(all, { view: 'archived' })).toEqual([stored])
    expect(filterItems(all, { view: 'gone' })).toEqual([sold])
  })

  it('filters by category and by season', () => {
    expect(filterItems(all, { view: 'wardrobe', category: 'coats' })).toEqual([coat])
    expect(filterItems(all, { view: 'wardrobe', inSeasonOn: '2026-07-15' }).map((i) => i.name)).not.toContain('Wool coat')
    expect(filterItems(all, { view: 'wardrobe', inSeasonOn: '2026-11-15' }).map((i) => i.name)).toContain('Wool coat')
  })

  it('searches name and brand, ignoring case and Polish accents', () => {
    expect(filterItems(all, { view: 'wardrobe', query: 'cos' })).toEqual([tee])
    expect(filterItems(all, { view: 'wardrobe', query: 'ZOLTA' })).toEqual([skirt])
    expect(normalizeSearch('Łódź Café')).toBe('lodz cafe')
  })
})

describe('catalogue sorting', () => {
  const wears = buildWearIndex([
    { itemId: tee.id, date: '2026-10-01' },
    { itemId: tee.id, date: '2026-10-05' },
    { itemId: coat.id, date: '2026-10-08' },
  ])
  const pieces = [tee, coat, skirt]

  it('sorts by most and least worn, never-worn first when least worn', () => {
    expect(sortItems(pieces, 'mostWorn', wears).map((i) => i.id)).toEqual([tee.id, coat.id, skirt.id])
    expect(sortItems(pieces, 'leastWorn', wears).map((i) => i.id)).toEqual([skirt.id, coat.id, tee.id])
  })

  it('sorts by name naturally and by most recently added', () => {
    const a = item({ name: 'Jeans 10' })
    const b = item({ name: 'Jeans 2' })
    expect(sortItems([a, b], 'name', wears).map((i) => i.name)).toEqual(['Jeans 2', 'Jeans 10'])
    expect(sortItems([tee, coat], 'recent', wears)[0]).toBe(coat)
  })

  it('does not change the original array', () => {
    const before = [...pieces]
    sortItems(pieces, 'name', wears)
    expect(pieces).toEqual(before)
  })
})

describe('wear index', () => {
  it('counts wears and tracks first and last dates in any order', () => {
    const index = buildWearIndex([
      { itemId: 'a', date: '2026-10-05' },
      { itemId: 'a', date: '2026-09-01' },
      { itemId: 'a', date: '2026-10-09' },
    ])
    expect(index.get('a')).toEqual({ count: 3, first: '2026-09-01', last: '2026-10-09' })
    expect(index.get('b')).toBeUndefined()
  })
})

describe('quick count names and photo sizing', () => {
  it('continues numbering after existing pieces', () => {
    expect(placeholderNames('Jeans', 2, 1)).toEqual(['Jeans 2', 'Jeans 3'])
  })

  it('fits photos within 800px without upscaling', () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 800, height: 600 })
    expect(fitWithin(1170, 2532)).toEqual({ width: 370, height: 800 })
    expect(fitWithin(640, 480)).toEqual({ width: 640, height: 480 })
  })
})
