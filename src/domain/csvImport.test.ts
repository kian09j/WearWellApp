import { describe, expect, it } from 'vitest'
import { decodeCsvBytes, detectDelimiter, parseCsv } from './csv'
import {
  buildImport,
  CSV_TEMPLATE,
  guessMapping,
  matchCategory,
  matchColour,
  matchCondition,
  matchSeasons,
  parseCount,
  parseFlexibleDate,
  parsePriceCell,
} from './csvImport'

const TODAY = '2026-10-11'

describe('CSV parsing', () => {
  it('handles quotes, escaped quotes, commas and line breaks inside fields', () => {
    const text = 'name,notes\r\n"Coat, wool","Says ""dry clean""\nonly"\r\nTee,\r\n\r\n'
    expect(parseCsv(text)).toEqual([
      ['name', 'notes'],
      ['Coat, wool', 'Says "dry clean"\nonly'],
      ['Tee', ''],
    ])
  })

  it('detects semicolons (Polish Excel) and tabs, and ignores a byte-order mark', () => {
    expect(detectDelimiter('nazwa;kategoria;cena\nSweter;sweter;"1,5"')).toBe(';')
    expect(detectDelimiter('a\tb\tc')).toBe('\t')
    expect(parseCsv('﻿nazwa;cena\nSweter;"349,00"')).toEqual([
      ['nazwa', 'cena'],
      ['Sweter', '349,00'],
    ])
  })

  it('reads Windows-1250 files from Polish Excel as well as UTF-8', () => {
    // "Spódnica;żółta" in Windows-1250
    const cp1250 = new Uint8Array([0x53, 0x70, 0xf3, 0x64, 0x6e, 0x69, 0x63, 0x61, 0x3b, 0xbf, 0xf3, 0xb3, 0x74, 0x61]).buffer
    expect(decodeCsvBytes(cp1250)).toBe('Spódnica;żółta')
    expect(decodeCsvBytes(new TextEncoder().encode('Spódnica;żółta').buffer as ArrayBuffer)).toBe('Spódnica;żółta')
  })
})

describe('matching columns', () => {
  it('recognises common English and Polish headers', () => {
    expect(guessMapping(['Item Name', 'Category', 'Color', 'Brand', 'Purchase Price', 'Date Purchased', 'Times Worn', 'Notes'])).toEqual({
      name: 0,
      category: 1,
      colour: 2,
      brand: 3,
      price: 4,
      purchaseDate: 5,
      timesWorn: 6,
      notes: 7,
    })
    expect(guessMapping(['Nazwa', 'Kategoria', 'Kolor', 'Rozmiar', 'Cena', 'Data zakupu', 'Stan', 'Uwagi'])).toEqual({
      name: 0,
      category: 1,
      colour: 2,
      size: 3,
      price: 4,
      purchaseDate: 5,
      condition: 6,
      notes: 7,
    })
  })

  it('leaves unknown columns unmatched and never uses a column twice', () => {
    const m = guessMapping(['Name', 'Photo URL', 'Description'])
    expect(m).toEqual({ name: 0, notes: 2 })
  })
})

describe('matching values', () => {
  it('maps category words, most specific first, in English and Polish', () => {
    expect(matchCategory('T-Shirt').category).toBe('tshirts')
    expect(matchCategory('Dress shirt').category).toBe('shirts')
    expect(matchCategory('Skinny jeans').category).toBe('jeans')
    expect(matchCategory('Hoodie').category).toBe('sweatshirts')
    expect(matchCategory('Ankle boots').category).toBe('shoes')
    expect(matchCategory('Trench coat').category).toBe('coats')
    expect(matchCategory('Spódnica').category).toBe('skirts')
    expect(matchCategory('Sweter').category).toBe('knitwear')
    expect(matchCategory('Płaszcz').category).toBe('coats')
    expect(matchCategory('Torebka').category).toBe('bags')
    expect(matchCategory('Bluza').category).toBe('sweatshirts')
    expect(matchCategory('Bluzka').category).toBe('shirts')
    expect(matchCategory('Laptop')).toEqual({ category: 'other', recognised: false })
  })

  it('maps colours, with the first named one winning and several meaning multicolour', () => {
    expect(matchColour('Navy blue')).toBe('navy')
    expect(matchColour('Off-white')).toBe('cream')
    expect(matchColour('Light blue')).toBe('lightblue')
    expect(matchColour('Olive green')).toBe('khaki')
    expect(matchColour('Camel')).toBe('beige')
    expect(matchColour('czarna')).toBe('black')
    expect(matchColour('Żółty')).toBe('yellow')
    expect(matchColour('black/white')).toBe('multi')
    expect(matchColour('Floral')).toBe('multi')
    expect(matchColour('Holographic')).toBeUndefined()
  })

  it('maps seasons, conditions and wear counts', () => {
    expect(matchSeasons('Autumn, Winter')).toEqual(['autumn', 'winter'])
    expect(matchSeasons('fall/winter')).toEqual(['autumn', 'winter'])
    expect(matchSeasons('All year')).toEqual([])
    expect(matchSeasons('lato')).toEqual(['summer'])
    expect(matchSeasons('whenever')).toBeUndefined()
    expect(matchCondition('NWT')).toBe('new_with_tags')
    expect(matchCondition('Like new')).toBe('very_good')
    expect(matchCondition('Bardzo dobry')).toBe('very_good')
    expect(matchCondition('Good')).toBe('good')
    expect(matchCondition('Used')).toBe('satisfactory')
    expect(parseCount('23 times')).toBe(23)
    expect(parseCount('')).toBeUndefined()
  })

  it('reads dates the way apps and spreadsheets write them, ignoring future ones', () => {
    expect(parseFlexibleDate('2024-03-15', TODAY)).toBe('2024-03-15')
    expect(parseFlexibleDate('2024-03-15T10:30:00Z', TODAY)).toBe('2024-03-15')
    expect(parseFlexibleDate('15.03.2024', TODAY)).toBe('2024-03-15')
    expect(parseFlexibleDate('15/03/2024', TODAY)).toBe('2024-03-15')
    expect(parseFlexibleDate('03/15/2024', TODAY)).toBe('2024-03-15')
    expect(parseFlexibleDate('2024-03', TODAY)).toBe('2024-03-01')
    expect(parseFlexibleDate('2023', TODAY)).toBe('2023-01-01')
    expect(parseFlexibleDate('45366', TODAY)).toBe('2024-03-15') // Excel serial number
    expect(parseFlexibleDate('2030-01-01', TODAY)).toBeUndefined()
    expect(parseFlexibleDate('31.02.2024', TODAY)).toBeUndefined()
    expect(parseFlexibleDate('soon', TODAY)).toBeUndefined()
  })

  it('reads prices with currency symbols or codes', () => {
    expect(parsePriceCell('349 zł')).toEqual({ amount: 349, currency: 'PLN' })
    expect(parsePriceCell('€84,50')).toEqual({ amount: 84.5, currency: 'EUR' })
    expect(parsePriceCell('1 299.00 PLN')).toEqual({ amount: 1299, currency: 'PLN' })
    expect(parsePriceCell('£40')).toEqual({ amount: 40, currency: 'GBP' })
    expect(parsePriceCell('49')).toEqual({ amount: 49, currency: undefined })
    expect(parsePriceCell('free?')).toBeUndefined()
  })
})

describe('building the import', () => {
  const opts = {
    currency: 'PLN' as const,
    today: TODAY,
    existingNames: new Set(['wool coat']),
    nameForCategory: (c: string) => (c === 'tshirts' ? 'T-shirt' : 'Piece'),
  }

  it('turns the template into pieces, with "last worn" as a real wear and the rest as earlier wears', () => {
    const rows = parseCsv(CSV_TEMPLATE)
    const mapping = guessMapping(rows[0]!)
    const { pieces, skipped } = buildImport(rows.slice(1), mapping, opts)
    expect(skipped).toEqual([])
    expect(pieces).toHaveLength(3)
    const [tee, coat, boots] = pieces
    expect(tee!.item).toEqual({
      name: 'White T-shirt',
      category: 'tshirts',
      colour: 'white',
      brand: 'COS',
      size: 'M',
      price: { amount: 59, currency: 'PLN' },
      purchaseDate: '2025-03-15',
      seasons: [],
      condition: 'good',
      priorWears: 23,
    })
    expect(tee!.lastWorn).toBe('2026-10-01')
    expect(coat!.item).toMatchObject({ category: 'coats', colour: 'beige', seasons: ['autumn', 'winter'], priorWears: 30, notes: 'Dry clean only' })
    expect(coat!.duplicate).toBe(true)
    expect(boots!.item).toMatchObject({ category: 'shoes', colour: 'black', seasons: ['autumn', 'winter'] })
    expect(boots!.item.priorWears).toBeUndefined()
    expect(tee!.row).toBe(2)
  })

  it('names a nameless row after its category, skips rows with neither, and flags unknown categories', () => {
    const rows = [
      ['', 't-shirt', ''],
      ['', '', 'red'],
      ['Mystery thing', 'gadget', ''],
      ['Linen dress', '', '120 €'],
    ]
    const { pieces, skipped } = buildImport(rows, { name: 0, category: 1, price: 2 }, opts)
    expect(pieces.map((p) => [p.item.name, p.item.category, p.categoryGuessed])).toEqual([
      ['T-shirt', 'tshirts', false],
      ['Mystery thing', 'other', true],
      ['Linen dress', 'dresses', false],
    ])
    expect(pieces[2]!.item.price).toEqual({ amount: 120, currency: 'EUR' })
    expect(skipped).toEqual([{ row: 3, reason: 'noName' }])
  })
})
