import type { DateKey, Item, NudgeThresholds } from './types'
import { addDays } from './dates'
import { inSeasonUnwornDays, type UnwornContext } from './unworn'
import { wearStat, type WearIndex } from './wearStats'

// Gentle nudges for pieces that have been resting, counted in in-season days (see unworn.ts).
//   Stage 1: suggest wearing it this week.
//   Stage 2: ask keep / sell / donate.
//   Stage 3: suggest selling it on Vinted.
// Only pieces "in rotation" are nudged: never occasion, sentimental, listed, archived, sold,
// donated or wishlist pieces. "Later" snoozes a piece for two weeks; keeping it for "another
// reason" pauses it for three months; wearing it restarts the count from zero.

export type NudgeStage = 1 | 2 | 3

export const SNOOZE_DAYS = 14
export const KEEP_PAUSE_DAYS = 90
export const THRESHOLD_MIN = 7
export const THRESHOLD_MAX = 365

export interface Nudge {
  item: Item
  stage: NudgeStage
  unwornDays: number
  lastWorn?: DateKey
  snoozed: boolean
}

export function nudgeStage(days: number, t: NudgeThresholds): NudgeStage | null {
  if (days >= t.stage3) return 3
  if (days >= t.stage2) return 2
  if (days >= t.stage1) return 1
  return null
}

export function isPaused(item: Pick<Item, 'nudge'>, today: DateKey): boolean {
  return !!item.nudge?.pausedUntil && item.nudge.pausedUntil > today
}

export function isSnoozed(item: Pick<Item, 'nudge'>, today: DateKey): boolean {
  return !!item.nudge?.snoozedUntil && item.nudge.snoozedUntil > today
}

export function canBeNudged(item: Item): boolean {
  return item.kind === 'owned' && item.status === 'active'
}

/** Every piece with a nudge, the most pressing first. Snoozed ones only when asked for. */
export function findNudges(
  items: readonly Item[],
  wears: WearIndex,
  ctx: UnwornContext,
  thresholds: NudgeThresholds,
  opts: { includeSnoozed?: boolean } = {},
): Nudge[] {
  const nudges: Nudge[] = []
  for (const item of items) {
    if (!canBeNudged(item) || isPaused(item, ctx.today)) continue
    const snoozed = isSnoozed(item, ctx.today)
    if (snoozed && !opts.includeSnoozed) continue
    const lastWorn = wearStat(wears, item.id).last
    const unwornDays = inSeasonUnwornDays(item, lastWorn, ctx)
    const stage = nudgeStage(unwornDays, thresholds)
    if (stage) nudges.push({ item, stage, unwornDays, lastWorn, snoozed })
  }
  return nudges.sort((a, b) => b.stage - a.stage || b.unwornDays - a.unwornDays || a.item.name.localeCompare(b.item.name))
}

/** The single nudge shown on Today, never the piece already on the rediscovery card. */
export function todaysNudge(nudges: readonly Nudge[], avoidItemId?: string): Nudge | null {
  return nudges.find((n) => !n.snoozed && n.item.id !== avoidItemId) ?? null
}

export function snoozeUntil(today: DateKey): DateKey {
  return addDays(today, SNOOZE_DAYS)
}

export function keepPauseUntil(today: DateKey): DateKey {
  return addDays(today, KEEP_PAUSE_DAYS)
}

/** Thresholds must rise stage by stage and stay within sensible bounds. */
export function validThresholds(t: NudgeThresholds): boolean {
  const inRange = (n: number) => Number.isInteger(n) && n >= THRESHOLD_MIN && n <= THRESHOLD_MAX
  return inRange(t.stage1) && inRange(t.stage2) && inRange(t.stage3) && t.stage1 < t.stage2 && t.stage2 < t.stage3
}
