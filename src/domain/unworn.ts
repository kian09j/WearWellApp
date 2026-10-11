import type { DateKey, Item, Season, WearLog } from './types'
import { addDays, isAllYear, seasonOf, toDateKey } from './dates'
import { loggedDays } from './streak'

// How long has a piece been waiting? We count only days that are fair to count:
//   - days in the piece's seasons (a winter coat is not neglected in July),
//   - completed days, from the day after the last wear (or the day the piece was added to the
//     app, if later) up to yesterday; today is not over yet,
//   - not days inside a logging gap: a run of 7 or more days where nothing at all was logged.
//     A holiday or a forgotten week should not make the whole wardrobe look unworn.

export const MIN_GAP_DAYS = 7

interface DayInfo {
  key: DateKey
  season: Season
  gap: boolean
}

export interface UnwornContext {
  today: DateKey
  /** Every day from the start of the window to yesterday. */
  days: readonly DayInfo[]
  index: ReadonlyMap<DateKey, number>
}

/** Days that sit inside a run of at least `minGap` consecutive days with no logs. */
export function findGapDays(logged: ReadonlySet<DateKey>, from: DateKey, to: DateKey, minGap = MIN_GAP_DAYS): Set<DateKey> {
  const gaps = new Set<DateKey>()
  let run: DateKey[] = []
  const close = () => {
    if (run.length >= minGap) for (const d of run) gaps.add(d)
    run = []
  }
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (logged.has(d)) close()
    else run.push(d)
  }
  close()
  return gaps
}

/** The local date a piece was added to the app. */
export function addedOn(item: Pick<Item, 'createdAt'>): DateKey {
  return toDateKey(new Date(item.createdAt))
}

/**
 * The first day that counts towards "unworn": the latest of the day after the last wear, the
 * day the piece was added, and the purchase date (a wishlist piece bought today starts today).
 */
export function unwornSince(item: Pick<Item, 'createdAt' | 'purchaseDate'>, lastWorn: DateKey | undefined): DateKey {
  let start = addedOn(item)
  if (item.purchaseDate && item.purchaseDate > start) start = item.purchaseDate
  if (lastWorn) {
    const after = addDays(lastWorn, 1)
    if (after > start) start = after
  }
  return start
}

export function makeUnwornContext(
  today: DateKey,
  wears: readonly Pick<WearLog, 'date'>[],
  items: readonly Pick<Item, 'createdAt'>[],
): UnwornContext {
  const yesterday = addDays(today, -1)
  let earliest = yesterday
  for (const item of items) {
    const added = addedOn(item)
    if (added < earliest) earliest = added
  }
  // start a little earlier so a gap that began before the oldest piece is measured in full
  const from = addDays(earliest, -MIN_GAP_DAYS)
  const gaps = findGapDays(loggedDays(wears), from, yesterday)
  const days: DayInfo[] = []
  const index = new Map<DateKey, number>()
  for (let d = from; d <= yesterday; d = addDays(d, 1)) {
    index.set(d, days.length)
    days.push({ key: d, season: seasonOf(d), gap: gaps.has(d) })
  }
  return { today, days, index }
}

/** In-season, non-gap, completed days since the piece was last worn (or added). */
export function inSeasonUnwornDays(
  item: Pick<Item, 'createdAt' | 'seasons' | 'purchaseDate'>,
  lastWorn: DateKey | undefined,
  ctx: UnwornContext,
): number {
  const start = ctx.index.get(unwornSince(item, lastWorn))
  if (start === undefined) return 0 // starts today or later
  const allYear = isAllYear(item.seasons)
  let count = 0
  for (let i = start; i < ctx.days.length; i++) {
    const day = ctx.days[i]!
    if (!day.gap && (allYear || item.seasons.includes(day.season))) count++
  }
  return count
}
