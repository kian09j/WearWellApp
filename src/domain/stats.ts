import type { ColourId, CurrencyCode, DateKey, Item } from './types'
import { addDays, isInSeason } from './dates'
import { countsForCpw } from './cpw'
import { roundMoney } from './money'
import { wearStat, type WearIndex } from './wearStats'

// Everything on the Stats screen. "In the wardrobe" means owned and not archived, sold or
// donated (the same pieces cost per wear counts); wishlist pieces never count.

export const inWardrobe = countsForCpw

export interface Ranked {
  item: Item
  wears: number
  last?: DateKey
  cpw?: number
}

const ranked = (item: Item, wears: WearIndex): Ranked => {
  const s = wearStat(wears, item.id)
  return { item, wears: s.count, last: s.last, cpw: item.price && s.count > 0 ? roundMoney(item.price.amount / s.count) : undefined }
}

export function mostWorn(items: readonly Item[], wears: WearIndex, n = 5): Ranked[] {
  return items
    .filter(inWardrobe)
    .map((i) => ranked(i, wears))
    .filter((r) => r.wears > 0)
    .sort((a, b) => b.wears - a.wears || (b.last ?? '').localeCompare(a.last ?? '') || a.item.name.localeCompare(b.item.name))
    .slice(0, n)
}

/** Pieces in rotation and in season with the fewest wears: framed as ready for more outings. */
export function leastWorn(items: readonly Item[], wears: WearIndex, today: DateKey, n = 5): Ranked[] {
  return items
    .filter((i) => inWardrobe(i) && i.status === 'active' && isInSeason(i.seasons, today))
    .map((i) => ranked(i, wears))
    .sort((a, b) => a.wears - b.wears || (a.last ?? '').localeCompare(b.last ?? '') || a.item.name.localeCompare(b.item.name))
    .slice(0, n)
}

function pricedAndWorn(items: readonly Item[], wears: WearIndex, currency: CurrencyCode): Ranked[] {
  return items
    .filter((i) => inWardrobe(i) && i.price?.currency === currency)
    .map((i) => ranked(i, wears))
    .filter((r) => r.cpw !== undefined)
}

export function bestCpw(items: readonly Item[], wears: WearIndex, currency: CurrencyCode, n = 3): Ranked[] {
  return pricedAndWorn(items, wears, currency)
    .sort((a, b) => a.cpw! - b.cpw! || b.wears - a.wears)
    .slice(0, n)
}

/** Highest cost per wear among worn pieces: the ones each wear helps most. */
export function highestCpw(items: readonly Item[], wears: WearIndex, currency: CurrencyCode, n = 3): Ranked[] {
  return pricedAndWorn(items, wears, currency)
    .sort((a, b) => b.cpw! - a.cpw! || a.wears - b.wears)
    .slice(0, n)
}

export interface ColourShare {
  colour: ColourId | 'none'
  count: number
}

export function colourBreakdown(items: readonly Item[]): ColourShare[] {
  const counts = new Map<ColourId | 'none', number>()
  for (const item of items) {
    if (!inWardrobe(item)) continue
    const key = item.colour ?? 'none'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([colour, count]) => ({ colour, count }))
    .sort((a, b) => b.count - a.count || (a.colour === 'none' ? 1 : b.colour === 'none' ? -1 : a.colour.localeCompare(b.colour)))
}

export interface WardrobeValue {
  currency: CurrencyCode
  amount: number
  priced: number
}

/** What the pieces in the wardrobe cost, per currency. */
export function wardrobeValue(items: readonly Item[]): WardrobeValue[] {
  const totals = new Map<CurrencyCode, WardrobeValue>()
  for (const item of items) {
    if (!inWardrobe(item) || !item.price) continue
    const v = totals.get(item.price.currency) ?? { currency: item.price.currency, amount: 0, priced: 0 }
    v.amount = roundMoney(v.amount + item.price.amount)
    v.priced++
    totals.set(item.price.currency, v)
  }
  return [...totals.values()].sort((a, b) => b.priced - a.priced)
}

export interface WornShare {
  worn: number
  total: number
  ratio: number
}

/** Share of the wardrobe worn at least once in the last `days` days (today included). */
export function wornShare(items: readonly Item[], wears: WearIndex, today: DateKey, days = 90): WornShare {
  const since = addDays(today, -(days - 1))
  const pieces = items.filter(inWardrobe)
  const worn = pieces.filter((i) => {
    const last = wearStat(wears, i.id).last
    return !!last && last >= since && last <= today
  }).length
  return { worn, total: pieces.length, ratio: pieces.length ? worn / pieces.length : 0 }
}
