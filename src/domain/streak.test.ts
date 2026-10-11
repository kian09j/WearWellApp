import { describe, expect, it } from 'vitest'
import { bestStreak, currentStreak, daysLoggedThisMonth, streakMessage } from './streak'

const days = (...keys: string[]) => new Set(keys)
const TODAY = '2026-10-11'

describe('current streak', () => {
  it('counts consecutive days ending today when today is logged', () => {
    expect(currentStreak(days('2026-10-09', '2026-10-10', '2026-10-11'), TODAY)).toEqual({ length: 3, includesToday: true })
  })

  it('does not break just because today is not logged yet', () => {
    expect(currentStreak(days('2026-10-09', '2026-10-10'), TODAY)).toEqual({ length: 2, includesToday: false })
  })

  it('is broken by a missed day before yesterday', () => {
    expect(currentStreak(days('2026-10-07', '2026-10-08', '2026-10-09'), TODAY).length).toBe(0)
  })

  it('crosses month and daylight-saving boundaries', () => {
    const run = days('2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27')
    expect(currentStreak(run, '2026-10-27').length).toBe(4)
    expect(currentStreak(days('2026-09-30', '2026-10-01'), '2026-10-01').length).toBe(2)
  })

  it('is zero with no logs', () => {
    expect(currentStreak(days(), TODAY)).toEqual({ length: 0, includesToday: false })
  })
})

describe('best streak and month count', () => {
  it('finds the longest run anywhere in the history', () => {
    const history = days('2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-10', '2026-10-10', '2026-10-11')
    expect(bestStreak(history)).toBe(4)
    expect(bestStreak(days())).toBe(0)
  })

  it('counts days logged this month up to today', () => {
    expect(daysLoggedThisMonth(days('2026-09-30', '2026-10-01', '2026-10-05', '2026-10-11'), TODAY)).toBe(3)
  })
})

describe('streak message', () => {
  it('shows the streak from two days on', () => {
    expect(streakMessage(days('2026-10-10', '2026-10-11'), TODAY)).toEqual({ kind: 'streak', length: 2, includesToday: true })
  })

  it('falls back to days this month and the best streak, never a loss message', () => {
    const history = days('2026-10-01', '2026-10-02', '2026-10-03', '2026-10-08')
    expect(streakMessage(history, TODAY)).toEqual({ kind: 'month', days: 4, best: 3 })
  })

  it('says nothing to someone who has not logged yet this month', () => {
    expect(streakMessage(days('2026-08-01'), TODAY)).toEqual({ kind: 'none' })
  })
})
