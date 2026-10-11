import type { DateKey, Item } from './types'
import { isInSeason } from './dates'
import { isWearable } from './logging'
import { inSeasonUnwornDays, type UnwornContext } from './unworn'
import { wearStat, type WearIndex } from './wearStats'

/** "Not worn in a while": at least this many in-season days. */
export const REDISCOVERY_MIN_DAYS = 14
/** The card rotates daily among this many of the longest-waiting pieces. */
export const REDISCOVERY_POOL = 5

export interface Rediscovery {
  item: Item
  unwornDays: number
  lastWorn?: DateKey
  /** Picked today and already worn today: show a happy "welcome back" instead. */
  wornToday: boolean
}

function hash(text: string): number {
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0
  return Math.abs(h)
}

/**
 * One piece in rotation, in season and waiting a while, chosen per day so it stays put all
 * day and changes tomorrow. `before` must index wears up to yesterday only, so that wearing
 * the piece today does not swap the card for another one.
 */
export function pickRediscovery(
  items: readonly Item[],
  before: WearIndex,
  wornToday: ReadonlySet<string>,
  ctx: UnwornContext,
  skipped: ReadonlySet<string> = new Set(),
): Rediscovery | null {
  const candidates = items
    .filter((i) => isWearable(i) && i.status === 'active' && isInSeason(i.seasons, ctx.today) && !skipped.has(i.id))
    .map((item) => {
      const lastWorn = wearStat(before, item.id).last
      return { item, lastWorn, unwornDays: inSeasonUnwornDays(item, lastWorn, ctx) }
    })
    .filter((c) => c.unwornDays >= REDISCOVERY_MIN_DAYS)
    .sort((a, b) => b.unwornDays - a.unwornDays || a.item.id.localeCompare(b.item.id))
  if (candidates.length === 0) return null
  const pool = candidates.slice(0, REDISCOVERY_POOL)
  const pick = pool[hash(ctx.today) % pool.length]!
  return { ...pick, wornToday: wornToday.has(pick.item.id) }
}
