import { describe, expect, it } from 'vitest'
import type { Item } from './types'
import { buildListing, plPhrase } from './listing'
import { ageFactor, moneyRecovered, suggestResalePrice } from './resale'
import { vintedSellUrl } from './vinted'

const TODAY = '2026-10-11'
const pln = (amount: number) => ({ amount, currency: 'PLN' as const })

describe('resale price suggestion', () => {
  it('scales the price by condition and age, as a ±15% range in friendly numbers', () => {
    // 349 × 0.4 (very good) × 0.8 (2 years) = 111.68 → 95 to 130, middle 110
    const s = suggestResalePrice({ price: pln(349), condition: 'very_good', purchaseDate: '2024-10-11' }, TODAY)!
    expect(s.low).toEqual(pln(95))
    expect(s.high).toEqual(pln(130))
    expect(s.mid).toEqual(pln(110))
    expect(s.conditionKnown && s.ageKnown).toBe(true)
  })

  it('values new-with-tags pieces highest and caps the age loss at half', () => {
    const tags = suggestResalePrice({ price: pln(189), condition: 'new_with_tags', purchaseDate: '2026-06-01' }, TODAY)!
    const worn = suggestResalePrice({ price: pln(189), condition: 'satisfactory', purchaseDate: '2026-06-01' }, TODAY)!
    expect(tags.mid.amount).toBeGreaterThan(worn.mid.amount)
    expect(ageFactor('2010-01-01', TODAY)).toBe(0.5)
    expect(ageFactor('2026-10-11', TODAY)).toBe(1)
  })

  it('assumes middling condition and age when unknown, and says so', () => {
    const s = suggestResalePrice({ price: pln(200) }, TODAY)!
    expect(s.mid).toEqual(pln(60)) // 200 × 0.35 × 0.85 = 59.5
    expect(s.conditionKnown).toBe(false)
    expect(s.ageKnown).toBe(false)
  })

  it('never suggests less than a sensible minimum and keeps the range open', () => {
    const s = suggestResalePrice({ price: pln(15), condition: 'satisfactory', purchaseDate: '2015-01-01' }, TODAY)!
    expect(s.low).toEqual(pln(5))
    expect(s.high.amount).toBeGreaterThan(s.low.amount)
  })

  it('rounds koruna to tens and needs a price at all', () => {
    const s = suggestResalePrice({ price: { amount: 1490, currency: 'CZK' }, condition: 'good', purchaseDate: '2025-10-11' }, TODAY)!
    expect(s.mid.amount % 10).toBe(0)
    expect(suggestResalePrice({}, TODAY)).toBeNull()
    expect(suggestResalePrice({ price: pln(0) }, TODAY)).toBeNull()
  })
})

describe('money recovered', () => {
  it('adds up sale prices of sold pieces, per currency', () => {
    const base = { createdAt: '', updatedAt: '', category: 'tshirts', seasons: [], favourite: false, placeholder: false, sample: false } as const
    const items = [
      { ...base, id: 'a', name: 'a', kind: 'owned', status: 'sold', sale: { ...pln(90), date: TODAY } },
      { ...base, id: 'b', name: 'b', kind: 'owned', status: 'sold', sale: { ...pln(45.5), date: TODAY } },
      { ...base, id: 'c', name: 'c', kind: 'owned', status: 'sold', sale: { amount: 20, currency: 'EUR', date: TODAY } },
      { ...base, id: 'd', name: 'd', kind: 'owned', status: 'donated' },
      { ...base, id: 'e', name: 'e', kind: 'owned', status: 'listed' },
    ] as unknown as Item[]
    const totals = moneyRecovered(items)
    expect(totals.get('PLN')).toEqual({ amount: 135.5, sold: 2 })
    expect(totals.get('EUR')).toEqual({ amount: 20, sold: 1 })
  })
})

describe('Vinted listing text', () => {
  const jumper = {
    name: 'Black merino jumper',
    category: 'knitwear' as const,
    colour: 'black' as const,
    brand: 'COS',
    size: 'M',
    condition: 'very_good' as const,
    purchaseDate: '2025-03-15',
    price: pln(349),
    placeholder: false,
  }

  it('writes an English listing from the piece’s own name', () => {
    const l = buildListing(jumper, 'en')
    expect(l.title).toBe('COS Black merino jumper, size M')
    expect(l.description).toBe(
      [
        'Black merino jumper by COS.',
        '',
        '• Size: M',
        '• Colour: black',
        '• Condition: very good',
        '• Bought: March 2025',
        '• Original price: PLN 349',
        '',
        'Questions welcome, just send me a message.',
      ].join('\n'),
    )
  })

  it('writes a Polish listing with the colour agreeing with the noun', () => {
    const l = buildListing(jumper, 'pl')
    expect(l.title).toBe('Czarny sweter COS, rozm. M')
    expect(l.description).toContain('• Stan: bardzo dobry')
    expect(l.description).toContain('• Data zakupu: marzec 2025')
    expect(l.description).toContain('• Cena w sklepie: 349 zł')
    expect(plPhrase('dresses', 'black')).toBe('Czarna sukienka')
    expect(plPhrase('trousers', 'beige')).toBe('Beżowe spodnie')
    expect(plPhrase('knitwear', 'blue')).toBe('Niebieski sweter')
    expect(plPhrase('skirts', 'lightblue')).toBe('Jasnoniebieska spódnica')
    expect(plPhrase('jeans', 'blue')).toBe('Niebieskie jeansy')
    expect(plPhrase('other', 'white')).toBe('Białe ubranie')
    expect(plPhrase('trousers', 'khaki')).toBe('Spodnie w kolorze khaki')
    expect(plPhrase('coats', undefined)).toBe('Płaszcz')
  })

  it('leaves out what it does not know and does not repeat the brand', () => {
    const l = buildListing({ name: 'COS wool coat', category: 'coats', brand: 'COS', placeholder: false }, 'en')
    expect(l.title).toBe('COS wool coat')
    expect(l.description).toBe('COS wool coat.\n\nQuestions welcome, just send me a message.')
  })

  it('describes quick-count pieces by colour and category instead of "Jeans 2"', () => {
    expect(buildListing({ name: 'Jeans 2', category: 'jeans', colour: 'blue', placeholder: true }, 'en').title).toBe('Blue jeans')
  })

  it('opens the right country’s sell page', () => {
    expect(vintedSellUrl('pl')).toBe('https://www.vinted.pl/items/new')
    expect(vintedSellUrl('uk')).toBe('https://www.vinted.co.uk/items/new')
    expect(vintedSellUrl('nowhere')).toBe('https://www.vinted.pl/items/new')
  })
})
