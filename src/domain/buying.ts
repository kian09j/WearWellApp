import type { CategoryId, ColourId, DateKey, Item } from './types'
import { addDays, daysBetween } from './dates'
import { isWearable } from './logging'
import { roundMoney } from './money'
import { wearStat, type WearIndex } from './wearStats'

// "Buy better, not more": see what a new piece would really cost per wear, what you already
// own like it, and optionally sleep on it for a week before buying.

/** How often you'd realistically wear it, in wears per month. */
export const WEAR_FREQUENCIES = [1, 2, 4, 8, 15] as const
export type WearFrequency = (typeof WEAR_FREQUENCIES)[number]

export const PROJECTION_MONTHS = [3, 6, 12] as const
export const COOLING_OFF_DAYS = 7

/** Cost per wear after `months` at `wearsPerMonth`. */
export function projectedCpw(price: number, wearsPerMonth: number, months: number): number {
  const wears = wearsPerMonth * months
  return wears > 0 ? roundMoney(price / wears) : price
}

/** Pieces already in the wardrobe of the same category (and colour, when one is given). */
export function similarOwned(items: readonly Item[], category: CategoryId, colour: ColourId | undefined, wears: WearIndex): Item[] {
  return items
    .filter((i) => isWearable(i) && i.category === category && (!colour || i.colour === colour))
    .sort((a, b) => wearStat(wears, b.id).count - wearStat(wears, a.id).count || a.name.localeCompare(b.name))
}

export interface CoolingOff {
  active: boolean
  daysLeft: number
  until?: DateKey
}

export function coolingOffState(item: Pick<Item, 'wishlist'>, today: DateKey): CoolingOff {
  const until = item.wishlist?.coolingOffUntil
  if (!until || until <= today) return { active: false, daysLeft: 0, until }
  return { active: true, daysLeft: daysBetween(today, until), until }
}

export function coolingOffUntil(today: DateKey): DateKey {
  return addDays(today, COOLING_OFF_DAYS)
}

/** The frequency preset closest to a stored wears-per-month value. */
export function nearestFrequency(wearsPerMonth: number): WearFrequency {
  return WEAR_FREQUENCIES.reduce((best, f) => (Math.abs(f - wearsPerMonth) < Math.abs(best - wearsPerMonth) ? f : best), WEAR_FREQUENCIES[0])
}
