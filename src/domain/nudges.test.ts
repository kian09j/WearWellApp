import { describe, expect, it } from 'vitest'
import type { Item, Season } from './types'
import { addDays } from './dates'
import { findNudges, keepPauseUntil, nudgeStage, snoozeUntil, todaysNudge, validThresholds } from './nudges'
import { makeUnwornContext } from './unworn'
import { buildWearIndex } from './wearStats'

const TODAY = '2026-10-11'
const T = { stage1: 30, stage2: 60, stage3: 90 }

function piece(id: string, partial: Partial<Item> = {}, seasons: Season[] = []): Item {
  return {
    id,
    name: id,
    createdAt: '2026-01-01T12:00:00.000Z',
    updatedAt: '2026-01-01T12:00:00.000Z',
    kind: 'owned',
    category: 'tshirts',
    seasons,
    status: 'active',
    favourite: false,
    placeholder: false,
    sample: false,
    ...partial,
  }
}

const daily: { itemId: string; date: string }[] = []
for (let d = '2026-01-01'; d <= '2026-10-10'; d = addDays(d, 1)) daily.push({ itemId: 'other', date: d })
const wornDaysAgo = (id: string, days: number) => ({ itemId: id, date: addDays(TODAY, -days) })

describe('nudge stages', () => {
  it('maps in-season unworn days to stages at the default 30 / 60 / 90', () => {
    expect(nudgeStage(29, T)).toBeNull()
    expect(nudgeStage(30, T)).toBe(1)
    expect(nudgeStage(59, T)).toBe(1)
    expect(nudgeStage(60, T)).toBe(2)
    expect(nudgeStage(90, T)).toBe(3)
    expect(nudgeStage(400, T)).toBe(3)
  })

  it('follows custom thresholds', () => {
    expect(nudgeStage(20, { stage1: 14, stage2: 28, stage3: 42 })).toBe(1)
    expect(nudgeStage(45, { stage1: 14, stage2: 28, stage3: 42 })).toBe(3)
  })

  it('only accepts rising thresholds between 7 and 365 days', () => {
    expect(validThresholds(T)).toBe(true)
    expect(validThresholds({ stage1: 60, stage2: 30, stage3: 90 })).toBe(false)
    expect(validThresholds({ stage1: 30, stage2: 30, stage3: 90 })).toBe(false)
    expect(validThresholds({ stage1: 3, stage2: 30, stage3: 90 })).toBe(false)
    expect(validThresholds({ stage1: 30, stage2: 60, stage3: 400 })).toBe(false)
  })
})

describe('finding nudges', () => {
  const items = [
    piece('tee'), // worn 10 days ago: fine
    piece('blouse'), // 35 days: stage 1
    piece('skirt'), // 70 days: stage 2
    piece('dress'), // 100 days: stage 3
    piece('coat', {}, ['winter']), // last worn in February: not in season since
    piece('party', { status: 'occasion' }),
    piece('grandma', { status: 'sentimental' }),
    piece('listed', { status: 'listed' }),
    piece('stored', { status: 'archived' }),
    piece('wish', { kind: 'wishlist' }),
    piece('snoozed', { nudge: { snoozedUntil: addDays(TODAY, 3) } }),
    piece('paused', { nudge: { pausedUntil: addDays(TODAY, 40), keepReason: 'other' } }),
    piece('pauseOver', { nudge: { pausedUntil: addDays(TODAY, -1), keepReason: 'other' } }),
  ]
  const wears = [
    ...daily,
    wornDaysAgo('tee', 10),
    wornDaysAgo('blouse', 36),
    wornDaysAgo('skirt', 71),
    wornDaysAgo('dress', 101),
    { itemId: 'coat', date: '2026-02-10' },
    ...['party', 'grandma', 'listed', 'stored', 'wish', 'snoozed', 'paused', 'pauseOver'].map((id) => wornDaysAgo(id, 200)),
  ]
  const ctx = makeUnwornContext(TODAY, wears, items)
  const index = buildWearIndex(wears)

  it('nudges only pieces in rotation, most pressing first', () => {
    const nudges = findNudges(items, index, ctx, T)
    expect(nudges.map((n) => [n.item.id, n.stage])).toEqual([
      ['pauseOver', 3],
      ['dress', 3],
      ['skirt', 2],
      ['blouse', 1],
    ])
    expect(nudges.find((n) => n.item.id === 'dress')?.unwornDays).toBe(100)
  })

  it('leaves snoozed pieces out of Today but keeps them in the "waiting" list', () => {
    const all = findNudges(items, index, ctx, T, { includeSnoozed: true })
    expect(all.find((n) => n.item.id === 'snoozed')).toMatchObject({ snoozed: true, stage: 3 })
    expect(all.some((n) => n.item.id === 'paused')).toBe(false)
  })

  it('shows one nudge on Today, skipping the piece already on the rediscovery card', () => {
    const all = findNudges(items, index, ctx, T, { includeSnoozed: true })
    expect(todaysNudge(all)?.item.id).toBe('pauseOver')
    expect(todaysNudge(all, 'pauseOver')?.item.id).toBe('dress')
    expect(todaysNudge([])).toBeNull()
  })

  it('restarts the count once the piece is worn', () => {
    const afterWear = buildWearIndex([...wears, wornDaysAgo('dress', 1)])
    expect(findNudges(items, afterWear, ctx, T).some((n) => n.item.id === 'dress')).toBe(false)
  })

  it('snoozes for two weeks and pauses for three months', () => {
    expect(snoozeUntil(TODAY)).toBe('2026-10-25')
    expect(keepPauseUntil(TODAY)).toBe('2027-01-09')
  })
})
