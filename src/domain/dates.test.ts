import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, isDateKey, isInSeason, seasonOf, toDateKey } from './dates'

describe('dates', () => {
  it('formats local dates as keys', () => {
    expect(toDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })

  it('adds days across month, year and daylight-saving boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30') // clocks go forward on 29 March
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26') // clocks go back on 25 October
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('counts whole days between keys, even over a DST change', () => {
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
    expect(daysBetween('2026-10-10', '2026-10-03')).toBe(-7)
    expect(daysBetween('2026-01-01', '2027-01-01')).toBe(365)
  })

  it('validates keys', () => {
    expect(isDateKey('2026-02-28')).toBe(true)
    expect(isDateKey('2026-02-30')).toBe(false)
    expect(isDateKey('2026-2-3')).toBe(false)
    expect(isDateKey(20260203)).toBe(false)
  })

  it('maps months to meteorological seasons', () => {
    expect(seasonOf('2026-03-01')).toBe('spring')
    expect(seasonOf('2026-05-31')).toBe('spring')
    expect(seasonOf('2026-06-01')).toBe('summer')
    expect(seasonOf('2026-09-15')).toBe('autumn')
    expect(seasonOf('2026-12-01')).toBe('winter')
    expect(seasonOf('2026-02-28')).toBe('winter')
  })

  it('treats empty or all four seasons as all-year', () => {
    expect(isInSeason([], '2026-07-01')).toBe(true)
    expect(isInSeason(['spring', 'summer', 'autumn', 'winter'], '2026-07-01')).toBe(true)
    expect(isInSeason(['autumn', 'winter'], '2026-07-01')).toBe(false)
    expect(isInSeason(['autumn', 'winter'], '2026-10-10')).toBe(true)
  })
})
