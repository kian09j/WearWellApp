import type { DateKey, WearLog } from './types'

export interface WearStat {
  count: number
  first?: DateKey
  last?: DateKey
}

export type WearIndex = ReadonlyMap<string, WearStat>

export const NO_WEARS: WearStat = { count: 0 }

/** Wear count and first / last wear date per item, in one pass over the log. */
export function buildWearIndex(wears: readonly Pick<WearLog, 'itemId' | 'date'>[]): WearIndex {
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
  return index
}

export function wearStat(index: WearIndex, itemId: string): WearStat {
  return index.get(itemId) ?? NO_WEARS
}
