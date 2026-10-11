import { describe, expect, it } from 'vitest'
import type { Item, Season } from './types'
import { addDays } from './dates'
import { pickRediscovery, REDISCOVERY_POOL } from './rediscovery'
import { findGapDays, inSeasonUnwornDays, makeUnwornContext, unwornSince } from './unworn'
import { buildWearIndex } from './wearStats'

const TODAY = '2026-10-11'

/** A wear log for every day in [from, to], on some unrelated piece, so there are no gaps. */
function dailyLogs(from: string, to: string, skip: (d: string) => boolean = () => false) {
  const logs: { itemId: string; date: string }[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) if (!skip(d)) logs.push({ itemId: 'other', date: d })
  return logs
}

function piece(id: string, seasons: Season[] = [], addedOn = '2026-01-01', partial: Partial<Item> = {}): Item {
  return {
    id,
    name: id,
    createdAt: `${addedOn}T12:00:00.000Z`,
    updatedAt: `${addedOn}T12:00:00.000Z`,
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

describe('logging gaps', () => {
  const logged = new Set(dailyLogs('2026-09-01', '2026-09-30', (d) => (d >= '2026-09-10' && d <= '2026-09-20') || d === '2026-09-25').map((l) => l.date))

  it('treats 7 or more days without any log as a gap, shorter breaks as normal days', () => {
    const gaps = findGapDays(logged, '2026-09-01', '2026-09-30')
    expect(gaps.size).toBe(11)
    expect(gaps.has('2026-09-10')).toBe(true)
    expect(gaps.has('2026-09-20')).toBe(true)
    expect(gaps.has('2026-09-25')).toBe(false)
  })

  it('counts a gap still running at the end (away right now)', () => {
    const gaps = findGapDays(new Set(['2026-10-01']), '2026-10-01', '2026-10-10')
    expect(gaps.size).toBe(9)
  })
})

describe('in-season unworn days', () => {
  const ctx = makeUnwornContext(TODAY, dailyLogs('2026-01-01', '2026-10-10'), [piece('x')])

  it('counts completed days since the last wear, not today', () => {
    expect(inSeasonUnwornDays(piece('tee'), '2026-10-01', ctx)).toBe(9) // 2 to 10 October
    expect(inSeasonUnwornDays(piece('tee'), '2026-10-10', ctx)).toBe(0)
    expect(inSeasonUnwornDays(piece('tee'), TODAY, ctx)).toBe(0)
  })

  it('counts only days in the piece’s seasons', () => {
    // a coat last worn in spring: only 1 September to 10 October count
    expect(inSeasonUnwornDays(piece('coat', ['autumn', 'winter']), '2026-05-20', ctx)).toBe(40)
    // a summer dress in October: nothing has counted since summer ended
    expect(inSeasonUnwornDays(piece('dress', ['summer']), '2026-08-31', ctx)).toBe(0)
  })

  it('counts from the day a never-worn piece was added, never from before', () => {
    expect(inSeasonUnwornDays(piece('skirt', [], '2026-09-01'), undefined, ctx)).toBe(40)
    // a wear logged for a day before the piece was added still starts the count at the added date
    expect(unwornSince(piece('old', [], '2026-09-01'), '2026-06-01')).toBe('2026-09-01')
    expect(inSeasonUnwornDays(piece('new', [], TODAY), undefined, ctx)).toBe(0)
  })

  it('skips logging gaps', () => {
    const logs = dailyLogs('2026-09-01', '2026-10-10', (d) => d >= '2026-09-10' && d <= '2026-09-19')
    const withGap = makeUnwornContext(TODAY, logs, [piece('skirt', [], '2026-09-01')])
    expect(inSeasonUnwornDays(piece('skirt', [], '2026-09-01'), undefined, withGap)).toBe(30) // 40 days minus a 10-day gap
  })

  it('counts nothing for someone who has not logged anything yet', () => {
    const quiet = makeUnwornContext(TODAY, [], [piece('skirt', [], '2026-09-01')])
    expect(inSeasonUnwornDays(piece('skirt', [], '2026-09-01'), undefined, quiet)).toBe(0)
  })
})

describe('rediscovery card', () => {
  const logs = dailyLogs('2026-01-01', '2026-10-10')
  const items = [
    piece('blouse'),
    piece('skirt'),
    piece('trench', ['spring', 'autumn']),
    piece('scarf', ['autumn', 'winter']),
    piece('linen', ['summer']),
    piece('party', [], '2026-01-01', { status: 'occasion' }),
    piece('grandma', [], '2026-01-01', { status: 'sentimental' }),
    piece('listed', [], '2026-01-01', { status: 'listed' }),
    piece('stored', [], '2026-01-01', { status: 'archived' }),
    piece('jeans'),
  ]
  const wears = [
    ...logs,
    { itemId: 'blouse', date: '2026-08-01' },
    { itemId: 'skirt', date: '2026-09-01' },
    { itemId: 'trench', date: '2026-06-01' },
    { itemId: 'scarf', date: '2026-10-05' },
    { itemId: 'linen', date: '2026-08-15' },
    { itemId: 'jeans', date: '2026-10-10' },
  ]
  const ctx = makeUnwornContext(TODAY, wears, items)
  const before = buildWearIndex(wears)

  it('only offers active, in-season pieces that have waited at least two weeks', () => {
    const ids = new Set<string>()
    for (let d = 0; d < 30; d++) {
      const day = addDays(TODAY, d)
      const pick = pickRediscovery(items, before, new Set(), { ...ctx, today: day })
      if (pick) ids.add(pick.item.id)
    }
    expect([...ids].sort()).toEqual(['blouse', 'skirt', 'trench'])
  })

  it('stays the same all day and says so when it was worn today', () => {
    const first = pickRediscovery(items, before, new Set(), ctx)!
    const again = pickRediscovery(items, before, new Set([first.item.id]), ctx)!
    expect(again.item.id).toBe(first.item.id)
    expect(again.wornToday).toBe(true)
    expect(first.wornToday).toBe(false)
  })

  it('moves on to another piece after "not today"', () => {
    const first = pickRediscovery(items, before, new Set(), ctx)!
    const next = pickRediscovery(items, before, new Set(), ctx, new Set([first.item.id]))!
    expect(next.item.id).not.toBe(first.item.id)
  })

  it('rotates among the longest-waiting pieces only', () => {
    const many = Array.from({ length: 12 }, (_, i) => piece(`p${String(i).padStart(2, '0')}`))
    const manyWears = [...logs, ...many.map((p, i) => ({ itemId: p.id, date: addDays('2026-09-01', i) }))]
    const manyCtx = makeUnwornContext(TODAY, manyWears, many)
    const index = buildWearIndex(manyWears)
    const seen = new Set<string>()
    for (let d = 0; d < 60; d++) seen.add(pickRediscovery(many, index, new Set(), { ...manyCtx, today: TODAY })!.item.id)
    expect(seen.size).toBe(1) // same day, same pick
    const longest = ['p00', 'p01', 'p02', 'p03', 'p04'].slice(0, REDISCOVERY_POOL)
    expect(longest).toContain([...seen][0])
  })

  it('returns nothing when nothing has waited long enough', () => {
    expect(pickRediscovery([piece('jeans')], buildWearIndex([...logs, { itemId: 'jeans', date: '2026-10-10' }]), new Set(), ctx)).toBeNull()
  })
})
