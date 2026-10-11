import type { DateKey, Item, WearLog } from './types'

export interface WearStat {
  /** Logged wears plus any wears from before WearWell (imported or entered by hand). */
  count: number
  first?: DateKey
  last?: DateKey
}

export type WearIndex = ReadonlyMap<string, WearStat>

export const NO_WEARS: WearStat = { count: 0 }

/**
 * Wear count and first / last logged wear per item, in one pass over the log. Pass the items
 * too so that wears from before WearWell (`priorWears`) count towards cost per wear and rankings.
 * They have no dates, so they never affect streaks, "last worn" or unworn days.
 */
export function buildWearIndex(
  wears: readonly Pick<WearLog, 'itemId' | 'date'>[],
  items: readonly Pick<Item, 'id' | 'priorWears'>[] = [],
): WearIndex {
  const index = new Map<string, WearStat>()
  for (const { itemId, date } of wears) {
    const s = index.get(itemId)
    if (!s) {
      index.set(itemId, { count: 1, first: date, last: date })
      continue
    }
    s.count++
    if (date < s.first!) s.first = date
    if (date > s.last!) s.last = date
  }
  for (const item of items) {
    if (!item.priorWears || item.priorWears <= 0) continue
    const s = index.get(item.id)
    if (s) s.count += item.priorWears
    else index.set(item.id, { count: item.priorWears })
  }
  return index
}

export function wearStat(index: WearIndex, itemId: string): WearStat {
  return index.get(itemId) ?? NO_WEARS
}
