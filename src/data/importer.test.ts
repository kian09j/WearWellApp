import { beforeEach, describe, expect, it } from 'vitest'
import { parseCsv } from '../domain/csv'
import { buildImport, CSV_TEMPLATE, guessMapping } from '../domain/csvImport'
import { buildWearIndex, wearStat } from '../domain/wearStats'
import { db } from './db'
import { importPieces, undoImport } from './importer'
import { listItems } from './items'
import { listWears } from './wears'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('importing pieces', () => {
  it('adds the pieces with their last wear, counts earlier wears, and Undo removes it all', async () => {
    const rows = parseCsv(CSV_TEMPLATE)
    const { pieces } = buildImport(rows.slice(1), guessMapping(rows[0]!), {
      currency: 'PLN',
      today: '2026-10-11',
      existingNames: new Set(),
      nameForCategory: () => 'Piece',
    })
    const ids = await importPieces(pieces)
    expect(ids).toHaveLength(3)

    const items = await listItems()
    const wears = await listWears()
    expect(items.map((i) => i.name).sort()).toEqual(['Black ankle boots', 'White T-shirt', 'Wool coat'])
    expect(wears).toHaveLength(1)
    const tee = items.find((i) => i.name === 'White T-shirt')!
    // 1 logged wear on the last-worn day + 23 earlier wears = the 24 times worn in the file
    expect(wearStat(buildWearIndex(wears, items), tee.id)).toEqual({ count: 24, first: '2026-10-01', last: '2026-10-01' })
    // seasons come from the file, or from the category when the file has none
    expect(items.find((i) => i.name === 'White T-shirt')!.seasons).toEqual([])

    await undoImport(ids)
    expect(await listItems()).toHaveLength(0)
    expect(await listWears()).toHaveLength(0)
  })
})
