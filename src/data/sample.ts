import type {
  CategoryId,
  ColourId,
  Condition,
  CurrencyCode,
  DateKey,
  Item,
  ItemStatus,
  Outfit,
  Season,
  WearLog,
} from '../domain/types'
import { addDays, fromDateKey, isInSeason, today as todayKey } from '../domain/dates'
import { newId } from '../domain/ids'
import { db } from './db'
import { makeItem } from './items'
import { getSettings, updateSettings } from './settings'

// The sample wardrobe: 22 pieces plus 2 wishlist items and four months of outfits, all dated
// relative to today so every screen and every nudge stage has something to show.
//   - Pink silk blouse: last worn 70 days ago, so it reaches nudge stage 2.
//   - Green pleated skirt: never worn, tags still on, so it reaches stage 3.
//   - Trench coat: unworn since June, but only spring and autumn days count, so in October
//     it sits at stage 1, not stage 3.
//   - Linen dress and trousers: summer pieces, unworn lately, correctly never nudged in autumn.

export const SAMPLE_WINDOW_DAYS = 120

interface Spec {
  key: string
  name: string
  category: CategoryId
  colour: ColourId
  seasons: Season[]
  /** In PLN; scaled for other currencies. */
  price?: number
  brand?: string
  size?: string
  condition: Condition
  boughtDaysAgo?: number
  /** Chance of being worn on a logged, in-season day. */
  rate: number
  favourite?: boolean
  status?: ItemStatus
  /** Force the most recent wear to this many days ago. */
  lastWornDaysAgo?: number
  sold?: { daysAgo: number; price: number }
  notes?: string
}

const SPECS: Spec[] = [
  { key: 'merino', name: 'Black merino jumper', category: 'knitwear', colour: 'black', seasons: ['autumn', 'winter', 'spring'], price: 349, brand: 'COS', size: 'M', condition: 'very_good', boughtDaysAgo: 700, rate: 0.35, favourite: true },
  { key: 'jeans', name: 'Straight blue jeans', category: 'jeans', colour: 'blue', seasons: [], price: 399, brand: "Levi's", size: 'W28 L30', condition: 'good', boughtDaysAgo: 1100, rate: 0.45, favourite: true },
  { key: 'tee', name: 'White T-shirt', category: 'tshirts', colour: 'white', seasons: [], price: 59, brand: 'H&M', size: 'M', condition: 'good', boughtDaysAgo: 400, rate: 0.3 },
  { key: 'breton', name: 'Striped Breton top', category: 'tshirts', colour: 'navy', seasons: ['spring', 'summer', 'autumn'], price: 149, size: 'M', condition: 'very_good', boughtDaysAgo: 500, rate: 0.25, favourite: true },
  { key: 'linenDress', name: 'Linen summer dress', category: 'dresses', colour: 'beige', seasons: ['summer'], price: 329, brand: 'Mango', size: 'S', condition: 'very_good', boughtDaysAgo: 380, rate: 0.3 },
  { key: 'coat', name: 'Camel wool coat', category: 'coats', colour: 'beige', seasons: ['autumn', 'winter'], price: 899, size: '38', condition: 'very_good', boughtDaysAgo: 800, rate: 0.45 },
  { key: 'trench', name: 'Classic trench coat', category: 'coats', colour: 'beige', seasons: ['spring', 'autumn'], price: 690, brand: 'Reserved', size: '38', condition: 'very_good', boughtDaysAgo: 900, rate: 0, lastWornDaysAgo: 118 },
  { key: 'blouse', name: 'Pink silk blouse', category: 'shirts', colour: 'pink', seasons: [], price: 259, size: '36', condition: 'very_good', boughtDaysAgo: 300, rate: 0.15, lastWornDaysAgo: 70 },
  { key: 'sequin', name: 'Sequin party top', category: 'tshirts', colour: 'black', seasons: [], price: 179, brand: 'Zara', size: 'S', condition: 'very_good', boughtDaysAgo: 600, rate: 0, status: 'occasion' },
  { key: 'cardigan', name: "Grandma's knitted cardigan", category: 'knitwear', colour: 'burgundy', seasons: ['autumn', 'winter'], condition: 'good', rate: 0.05, status: 'sentimental', notes: 'Hand-knitted by my grandma.' },
  { key: 'hoodie', name: 'Grey hoodie', category: 'sweatshirts', colour: 'grey', seasons: [], size: 'L', condition: 'good', rate: 0.25, notes: 'A gift, so no price.' },
  { key: 'trousers', name: 'Black tailored trousers', category: 'trousers', colour: 'black', seasons: [], price: 279, brand: 'COS', size: '38', condition: 'very_good', boughtDaysAgo: 450, rate: 0.3 },
  { key: 'linenTrousers', name: 'Wide-leg linen trousers', category: 'trousers', colour: 'cream', seasons: ['spring', 'summer'], price: 239, size: 'M', condition: 'very_good', boughtDaysAgo: 200, rate: 0.3 },
  { key: 'denim', name: 'Denim jacket', category: 'jackets', colour: 'blue', seasons: ['spring', 'summer', 'autumn'], price: 249, brand: "Levi's", size: 'M', condition: 'good', boughtDaysAgo: 1500, rate: 0.15 },
  { key: 'sneakers', name: 'White leather sneakers', category: 'shoes', colour: 'white', seasons: [], price: 449, size: '38', condition: 'good', boughtDaysAgo: 500, rate: 0.5, favourite: true },
  { key: 'boots', name: 'Brown Chelsea boots', category: 'shoes', colour: 'brown', seasons: ['autumn', 'winter', 'spring'], price: 599, size: '38', condition: 'very_good', boughtDaysAgo: 650, rate: 0.45 },
  { key: 'tote', name: 'Leather tote bag', category: 'bags', colour: 'brown', seasons: [], price: 520, condition: 'very_good', boughtDaysAgo: 900, rate: 0.45, favourite: true },
  { key: 'skirt', name: 'Green pleated midi skirt', category: 'skirts', colour: 'green', seasons: [], price: 189, brand: 'Mango', size: 'S', condition: 'new_with_tags', boughtDaysAgo: 125, rate: 0, notes: 'Still has the tags on.' },
  { key: 'leggings', name: 'Running leggings', category: 'activewear', colour: 'black', seasons: [], price: 159, size: 'S', condition: 'good', boughtDaysAgo: 700, rate: 0.15 },
  { key: 'scarf', name: 'Wool scarf', category: 'accessories', colour: 'burgundy', seasons: ['autumn', 'winter'], price: 129, condition: 'very_good', boughtDaysAgo: 800, rate: 0.25 },
  { key: 'maxi', name: 'Floral maxi dress', category: 'dresses', colour: 'multi', seasons: ['summer'], price: 260, size: 'S', condition: 'good', boughtDaysAgo: 800, rate: 0.12, status: 'sold', sold: { daysAgo: 30, price: 90 } },
  { key: 'blazer', name: 'Navy blazer', category: 'blazers', colour: 'navy', seasons: [], price: 459, size: '38', condition: 'very_good', boughtDaysAgo: 1000, rate: 0.05, lastWornDaysAgo: 100, status: 'listed' },
]

const WISHLIST = [
  { name: 'Cream cashmere jumper', category: 'knitwear', colour: 'cream', seasons: ['autumn', 'winter', 'spring'], price: 590, wearsPerMonth: 4, addedDaysAgo: 3, coolingOffInDays: 4 },
  { name: 'Black ankle boots', category: 'shoes', colour: 'black', seasons: ['autumn', 'winter', 'spring'], price: 650, wearsPerMonth: 8, addedDaysAgo: 9, coolingOffInDays: -2 },
] as const

const OUTFITS = {
  weekend: { name: 'Easy weekend', keys: ['jeans', 'breton', 'sneakers', 'tote'] },
  office: { name: 'Office classic', keys: ['trousers', 'tee', 'merino', 'boots'] },
}

const PRICE_SCALE: Record<CurrencyCode, { factor: number; step: number }> = {
  PLN: { factor: 1, step: 1 },
  EUR: { factor: 0.24, step: 1 },
  CZK: { factor: 6, step: 10 },
  GBP: { factor: 0.2, step: 1 },
  USD: { factor: 0.26, step: 1 },
}

function scalePrice(pln: number, currency: CurrencyCode): number {
  const { factor, step } = PRICE_SCALE[currency]
  return Math.max(step, Math.round((pln * factor) / step) * step)
}

/** Small seeded PRNG so the sample wardrobe looks the same every time it is loaded. */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

const atTime = (date: DateKey, hour: number) => {
  const d = fromDateKey(date)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

export interface SampleData {
  items: Item[]
  wears: WearLog[]
  outfits: Outfit[]
}

export function buildSampleData(today: DateKey, currency: CurrencyCode): SampleData {
  const rng = mulberry32(20261010)
  const added = atTime(addDays(today, -SAMPLE_WINDOW_DAYS), 10)
  const money = (pln: number) => ({ amount: scalePrice(pln, currency), currency })

  const ids = new Map<string, string>()
  const items: Item[] = SPECS.map((s) => {
    const item = makeItem(
      {
        name: s.name,
        category: s.category,
        colour: s.colour,
        seasons: s.seasons,
        price: s.price !== undefined ? money(s.price) : undefined,
        purchaseDate: s.boughtDaysAgo !== undefined ? addDays(today, -s.boughtDaysAgo) : undefined,
        brand: s.brand,
        size: s.size,
        condition: s.condition,
        notes: s.notes,
        status: s.status ?? 'active',
        favourite: s.favourite ?? false,
        sale: s.sold ? { ...money(s.sold.price), date: addDays(today, -s.sold.daysAgo) } : undefined,
        sample: true,
      },
      added,
    )
    // drop undefined keys so records look like ones the app creates
    for (const k of Object.keys(item) as (keyof Item)[]) if (item[k] === undefined) delete item[k]
    ids.set(s.key, item.id)
    return item
  })

  for (const w of WISHLIST) {
    const item = makeItem(
      {
        kind: 'wishlist',
        name: w.name,
        category: w.category,
        colour: w.colour,
        seasons: [...w.seasons],
        price: money(w.price),
        wishlist: { wearsPerMonth: w.wearsPerMonth, coolingOffUntil: addDays(today, w.coolingOffInDays) },
        sample: true,
      },
      atTime(addDays(today, -w.addedDaysAgo), 19),
    )
    items.push(item)
  }

  const outfits: Outfit[] = Object.values(OUTFITS).map((o) => ({
    id: newId(),
    name: o.name,
    itemIds: o.keys.map((k) => ids.get(k)!),
    sample: true,
    createdAt: added,
    updatedAt: added,
  }))
  const [weekend, office] = outfits as [Outfit, Outfit]

  const wears: WearLog[] = []
  const log = (itemId: string, date: DateKey, outfitId?: string) => {
    const at = atTime(date, 20)
    wears.push({ id: newId(), itemId, date, ...(outfitId ? { outfitId } : {}), sample: true, createdAt: at, updatedAt: at })
  }

  let missed = 0
  for (let d = SAMPLE_WINDOW_DAYS - 1; d >= 1; d--) {
    const date = addDays(today, -d)
    // a streak over the last 9 days, otherwise most days, never more than two days off in a row
    const logged = d <= 9 || missed >= 2 || rng() < 0.8
    if (!logged) {
      missed++
      continue
    }
    missed = 0

    if (d === 1) {
      for (const id of weekend.itemIds) log(id, date, weekend.id)
      continue
    }
    if (d % 7 === 3 && isInSeason(SPECS[0]!.seasons, date)) {
      for (const id of office.itemIds) log(id, date, office.id)
      continue
    }

    const worn: string[] = []
    for (const s of SPECS) {
      if (s.sold && d <= s.sold.daysAgo) continue
      if (s.lastWornDaysAgo !== undefined) {
        if (d === s.lastWornDaysAgo) {
          worn.push(ids.get(s.key)!)
          continue
        }
        if (d < s.lastWornDaysAgo) continue
      }
      if (!isInSeason(s.seasons, date)) continue
      if (rng() < s.rate) worn.push(ids.get(s.key)!)
    }
    if (worn.length === 0) worn.push(ids.get('sneakers')!)
    for (const id of worn) log(id, date)
  }

  return { items, wears, outfits }
}

export async function removeSampleData(): Promise<void> {
  await db.transaction('rw', db.items, db.wears, db.outfits, async () => {
    await db.items.filter((i) => i.sample).delete()
    await db.wears.filter((w) => w.sample).delete()
    await db.outfits.filter((o) => o.sample).delete()
  })
}

export async function hasSampleData(): Promise<boolean> {
  return (await db.items.filter((i) => i.sample).count()) > 0
}

export async function loadSampleData(): Promise<void> {
  const { currency } = await getSettings()
  const data = buildSampleData(todayKey(), currency)
  await db.transaction('rw', db.items, db.wears, db.outfits, async () => {
    await removeSampleData()
    await db.items.bulkAdd(data.items)
    await db.wears.bulkAdd(data.wears)
    await db.outfits.bulkAdd(data.outfits)
  })
  await updateSettings({ onboarded: true })
}
