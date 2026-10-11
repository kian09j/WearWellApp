import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, seasonOf } from '../domain/dates'
import { buildSampleData } from './sample'

const TODAY = '2026-10-10'
const data = buildSampleData(TODAY, 'PLN')
const byName = (name: string) => data.items.find((i) => i.name === name)!
const wearsOf = (name: string) =>
  data.wears
    .filter((w) => w.itemId === byName(name).id)
    .map((w) => w.date)
    .sort()
const lastWear = (name: string) => wearsOf(name).at(-1)

describe('sample wardrobe', () => {
  it('has about 20 owned pieces plus a small wishlist, all tagged as sample', () => {
    expect(data.items.filter((i) => i.kind === 'owned')).toHaveLength(22)
    expect(data.items.filter((i) => i.kind === 'wishlist')).toHaveLength(2)
    expect(data.items.every((i) => i.sample)).toBe(true)
    expect(data.wears.every((w) => w.sample)).toBe(true)
  })

  it('leaves today unlogged and logs the weekend outfit yesterday', () => {
    expect(data.wears.some((w) => w.date === TODAY)).toBe(false)
    const yesterday = data.wears.filter((w) => w.date === addDays(TODAY, -1))
    const weekend = data.outfits.find((o) => o.name === 'Easy weekend')!
    expect(yesterday.map((w) => w.itemId).sort()).toEqual([...weekend.itemIds].sort())
    expect(yesterday.every((w) => w.outfitId === weekend.id)).toBe(true)
  })

  it('has a streak over the last 9 days and never skips more than two days in a row', () => {
    const days = new Set(data.wears.map((w) => w.date))
    for (let d = 1; d <= 9; d++) expect(days.has(addDays(TODAY, -d))).toBe(true)
    const sorted = [...days].sort()
    for (let i = 1; i < sorted.length; i++) {
      expect(daysBetween(sorted[i - 1]!, sorted[i]!)).toBeLessThanOrEqual(3)
    }
  })

  it('sets up the nudge demo pieces', () => {
    expect(wearsOf('Green pleated midi skirt')).toHaveLength(0)
    expect(lastWear('Pink silk blouse')).toBe(addDays(TODAY, -70))
    expect(lastWear('Classic trench coat')).toBe(addDays(TODAY, -118))
    expect(lastWear('Navy blazer')).toBe(addDays(TODAY, -100))
  })

  it('only wears seasonal pieces in season, and nothing after a piece was sold', () => {
    for (const date of wearsOf('Linen summer dress')) expect(seasonOf(date)).toBe('summer')
    const maxi = byName('Floral maxi dress')
    expect(maxi.status).toBe('sold')
    for (const date of wearsOf('Floral maxi dress')) expect(date < maxi.sale!.date).toBe(true)
  })

  it('scales prices to the chosen currency', () => {
    const eur = buildSampleData(TODAY, 'EUR')
    const coat = eur.items.find((i) => i.name === 'Camel wool coat')!
    expect(coat.price).toEqual({ amount: 216, currency: 'EUR' })
    expect(byName('Grey hoodie').price).toBeUndefined()
  })
})
