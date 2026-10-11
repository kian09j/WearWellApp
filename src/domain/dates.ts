import type { DateKey, Season } from './types'

// All calendar maths works on local 'YYYY-MM-DD' keys. Converting through Date at noon
// keeps daylight-saving changes from shifting a day.

const pad = (n: number) => String(n).padStart(2, '0')

export function toDateKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function today(): DateKey {
  return toDateKey(new Date())
}

export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y!, m! - 1, d!, 12)
}

export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  return toDateKey(fromDateKey(value)) === value
}

export function addDays(key: DateKey, days: number): DateKey {
  const d = fromDateKey(key)
  d.setDate(d.getDate() + days)
  return toDateKey(d)
}

/** Whole days from a to b (positive when b is later). */
export function daysBetween(a: DateKey, b: DateKey): number {
  return Math.round((fromDateKey(b).getTime() - fromDateKey(a).getTime()) / 86_400_000)
}

/** Northern Hemisphere meteorological seasons. */
export function seasonOf(key: DateKey): Season {
  const month = Number(key.slice(5, 7))
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

export function isAllYear(seasons: readonly Season[]): boolean {
  return seasons.length === 0 || seasons.length === 4
}

export function isInSeason(seasons: readonly Season[], key: DateKey): boolean {
  return isAllYear(seasons) || seasons.includes(seasonOf(key))
}
