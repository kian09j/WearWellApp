import type { DateKey, WearLog } from './types'
import { addDays } from './dates'

// A streak is consecutive days with at least one logged wear. Today not being logged yet
// never breaks it: the day is not over. When a streak does end we show the best streak and
// days logged this month instead, never a "streak lost" message.

export function loggedDays(wears: readonly Pick<WearLog, 'date'>[]): Set<DateKey> {
  return new Set(wears.map((w) => w.date))
}

export interface Streak {
  length: number
  /** True when today is already logged; false means it still counts up to yesterday. */
  includesToday: boolean
}

export function currentStreak(days: ReadonlySet<DateKey>, today: DateKey): Streak {
  const includesToday = days.has(today)
  let day = includesToday ? today : addDays(today, -1)
  let length = 0
  while (days.has(day)) {
    length++
    day = addDays(day, -1)
  }
  return { length, includesToday }
}

export function bestStreak(days: ReadonlySet<DateKey>): number {
  let best = 0
  for (const day of days) {
    if (days.has(addDays(day, -1))) continue // only start counting at the first day of a run
    let length = 1
    let next = addDays(day, 1)
    while (days.has(next)) {
      length++
      next = addDays(next, 1)
    }
    best = Math.max(best, length)
  }
  return best
}

export function daysLoggedThisMonth(days: ReadonlySet<DateKey>, today: DateKey): number {
  const month = today.slice(0, 7)
  let count = 0
  for (const day of days) if (day.startsWith(month) && day <= today) count++
  return count
}

export type StreakMessage =
  | { kind: 'streak'; length: number; includesToday: boolean }
  | { kind: 'month'; days: number; best: number }
  | { kind: 'none' }

/** What the streak chip on Today should say. Always something encouraging, or nothing. */
export function streakMessage(days: ReadonlySet<DateKey>, today: DateKey): StreakMessage {
  const streak = currentStreak(days, today)
  if (streak.length >= 2) return { kind: 'streak', ...streak }
  const month = daysLoggedThisMonth(days, today)
  if (month > 0) return { kind: 'month', days: month, best: bestStreak(days) }
  return { kind: 'none' }
}
