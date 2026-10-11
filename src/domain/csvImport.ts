import type { CategoryId, ColourId, Condition, CurrencyCode, DateKey, Item, Money, Season } from './types'
import { normalizeSearch } from './catalogue'
import { addDays, isDateKey } from './dates'
import { isCurrencyCode, parsePriceInput } from './money'

// Turning rows from another wardrobe app (or a spreadsheet) into WearWell pieces. Column names
// and values are matched loosely, in English and Polish; anything unclear falls back to a safe
// default the person can fix later. Nothing here touches the database.

export const IMPORT_FIELDS = [
  'name',
  'category',
  'colour',
  'brand',
  'size',
  'price',
  'currency',
  'purchaseDate',
  'seasons',
  'condition',
  'timesWorn',
  'lastWorn',
  'notes',
] as const
export type ImportField = (typeof IMPORT_FIELDS)[number]

/** Which CSV column (by index) feeds each field. */
export type ColumnMapping = Partial<Record<ImportField, number>>

const norm = (s: string) =>
  normalizeSearch(s)
    .replace(/[^a-z0-9#]+/g, ' ')
    .trim()

const HEADERS: Record<ImportField, string[]> = {
  name: ['name', 'item', 'item name', 'title', 'product', 'product name', 'nazwa', 'przedmiot', 'nazwa produktu'],
  category: ['category', 'type', 'item type', 'kind', 'clothing type', 'kategoria', 'typ', 'rodzaj'],
  colour: ['colour', 'color', 'colours', 'colors', 'main colour', 'main color', 'kolor'],
  brand: ['brand', 'designer', 'label', 'maker', 'marka', 'producent'],
  size: ['size', 'rozmiar'],
  price: ['price', 'purchase price', 'price paid', 'cost', 'paid', 'amount', 'retail price', 'cena', 'koszt', 'cena zakupu'],
  currency: ['currency', 'waluta'],
  purchaseDate: ['purchase date', 'date purchased', 'bought', 'date bought', 'bought on', 'purchased', 'data zakupu', 'kupiono', 'data kupna'],
  seasons: ['season', 'seasons', 'sezon', 'sezony', 'pora roku'],
  condition: ['condition', 'stan'],
  timesWorn: ['times worn', 'wears', 'wear count', 'worn', 'number of wears', '# wears', 'worn count', 'ile razy', 'liczba zalozen', 'noszone'],
  lastWorn: ['last worn', 'last wear', 'date last worn', 'last worn date', 'ostatnio noszone', 'ostatnio zalozone'],
  notes: ['notes', 'note', 'description', 'comments', 'comment', 'details', 'notatki', 'uwagi', 'opis'],
}

/** Best guess at which column holds which field. Each column is used at most once. */
export function guessMapping(headers: readonly string[]): ColumnMapping {
  const normalized = headers.map(norm)
  const used = new Set<number>()
  const mapping: ColumnMapping = {}
  // exact matches first, then "contains" matches for longer names
  for (const pass of ['exact', 'contains'] as const) {
    for (const field of IMPORT_FIELDS) {
      if (mapping[field] !== undefined) continue
      const synonyms = HEADERS[field]
      const index = normalized.findIndex(
        (h, i) => !used.has(i) && synonyms.some((s) => (pass === 'exact' ? h === s : s.length >= 4 && h.includes(s))),
      )
      if (index >= 0) {
        mapping[field] = index
        used.add(index)
      }
    }
  }
  return mapping
}

// ---- values ---------------------------------------------------------------------------------

/** Most specific first: "t-shirt" before "shirt", "jeans" before "trousers". Polish stems included. */
const CATEGORY_WORDS: [CategoryId, RegExp][] = [
  ['jeans', /\b(jeans|denims?|jeansy|dzinsy)\b/],
  ['shorts', /\b(shorts|szorty|spodenki)\b/],
  ['sweatshirts', /\b(hoodies?|sweatshirts?|crewnecks?|bluz[aey]?)\b/],
  ['tshirts', /\b(t ?shirts?|tees?|tops?|tanks?|tank tops?|camisoles?|polos?|koszulk\w*|topy?)\b/],
  ['shirts', /\b(shirts?|blouses?|koszul\w*|bluzk\w*)\b/],
  ['knitwear', /\b(jumpers?|sweaters?|cardigans?|knit\w*|pullovers?|swetr?\w*|kardigan\w*)\b/],
  ['blazers', /\b(blazers?|suits?|marynark\w*|garnitur\w*)\b/],
  ['dresses', /\b(dress(es)?|jumpsuits?|playsuits?|sukien\w*|kombinezon\w*)\b/],
  ['skirts', /\b(skirts?|spodnic\w*)\b/],
  ['coats', /\b(coats?|parkas?|trench\w*|puffers?|overcoats?|plaszcz\w*)\b/],
  ['jackets', /\b(jackets?|bombers?|gilets?|windbreakers?|kurtk\w*)\b/],
  ['activewear', /\b(activewear|sportswear|sports?|gym|leggings|running|legginsy|sportow\w*)\b/],
  ['trousers', /\b(trousers|pants|chinos|slacks|spodnie)\b/],
  ['shoes', /\b(shoes?|sneakers?|trainers?|boots?|heels?|sandals?|loafers?|flats|footwear|buty|trampki|sneakersy|kozaki|sandaly|botki|szpilki|mokasyny|obuwie)\b/],
  ['bags', /\b(bags?|handbags?|purses?|totes?|backpacks?|clutch(es)?|torebk\w*|torb\w*|plecak\w*)\b/],
  ['accessories', /\b(accessor\w*|scarf|scarves|hats?|caps?|belts?|gloves|jewell?ery|sunglasses|ties?|szalik\w*|czapk\w*|pas(ek|ki)|rekawiczki|bizuteria|okulary|apaszk\w*|dodat\w*)\b/],
]

export function matchCategory(text: string): { category: CategoryId; recognised: boolean } {
  const t = norm(text)
  if (!t) return { category: 'other', recognised: false }
  for (const [category, re] of CATEGORY_WORDS) if (re.test(t)) return { category, recognised: true }
  return { category: 'other', recognised: false }
}

const COLOUR_WORDS: [ColourId, RegExp][] = [
  ['multi', /\b(multi\w*|patterned|pattern|print(ed)?|striped|stripes|floral|check(ed)?|plaid|kolorow\w*|wielokolor\w*|wzor\w*|paski|kwiaty)\b/],
  ['lightblue', /\b(light blue|sky blue|baby blue|pale blue|jasnoniebiesk\w*|blekitn\w*)\b/],
  ['navy', /\b(navy|navy blue|granat\w*)\b/],
  ['blue', /\b(blue|cobalt|denim|indigo|niebiesk\w*|chabrow\w*)\b/],
  ['black', /\b(black|czarn\w*)\b/],
  ['white', /\b(white|bial\w*)\b/],
  ['cream', /\b(cream|ecru|ivory|off white|kremow\w*|smietankow\w*)\b/],
  ['grey', /\b(gr[ae]y|charcoal|silver|anthracite|szar\w*|grafit\w*|srebrn\w*)\b/],
  ['khaki', /\b(khaki|olive|oliwk\w*)\b/],
  ['green', /\b(green|emerald|mint|sage|ziel\w*|mietow\w*)\b/],
  ['beige', /\b(beige|camel|tan|sand|nude|taupe|bez\w*|karmel\w*|piaskow\w*)\b/],
  ['brown', /\b(brown|chocolate|cognac|braz\w*|czekolad\w*|koniak\w*)\b/],
  ['burgundy', /\b(burgundy|wine|maroon|bordeaux|bordo\w*|wisni\w*)\b/],
  ['red', /\b(red|scarlet|czerwon\w*)\b/],
  ['pink', /\b(pink|blush|rose|fuchsia|roz\w*)\b/],
  ['purple', /\b(purple|lilac|lavender|violet|plum|fiolet\w*|liliow\w*|lawendow\w*)\b/],
  ['yellow', /\b(yellow|mustard|zolt\w*|musztard\w*)\b/],
  ['orange', /\b(orange|rust|coral|terracotta|pomarancz\w*|ceglast\w*|rud\w*)\b/],
]

/**
 * "navy blue" is navy and "off white" is cream: the colour named first wins. Several colours
 * listed with a separator ("black/white", "red and blue") or a pattern word mean multicolour.
 */
export function matchColour(text: string): ColourId | undefined {
  const raw = text.toLocaleLowerCase()
  const t = norm(text)
  if (!t) return undefined
  const found = COLOUR_WORDS.map(([colour, re]) => ({ colour, at: t.search(re) })).filter((f) => f.at >= 0)
  if (found.length === 0) return undefined
  if (found.some((f) => f.colour === 'multi')) return 'multi'
  const distinct = new Set(found.map((f) => f.colour))
  if (distinct.size > 1 && /[,/&+;|]| and | i | oraz /.test(` ${raw} `)) return 'multi'
  return found.sort((a, b) => a.at - b.at)[0]!.colour
}

export function matchSeasons(text: string): Season[] | undefined {
  const t = norm(text)
  if (!t) return undefined
  if (/\b(all|all year|year round|any|caly rok|caloroczn\w*|wszystkie)\b/.test(t)) return []
  const seasons: Season[] = []
  if (/\b(spring|wiosn\w*)\b/.test(t)) seasons.push('spring')
  if (/\b(summer|lato|letni\w*)\b/.test(t)) seasons.push('summer')
  if (/\b(autumn|fall|jesien\w*)\b/.test(t)) seasons.push('autumn')
  if (/\b(winter|zim\w*)\b/.test(t)) seasons.push('winter')
  if (seasons.length === 0) return undefined
  return seasons.length === 4 ? [] : seasons
}

export function matchCondition(text: string): Condition | undefined {
  const t = norm(text)
  if (!t) return undefined
  if (/\b(nwt|new with tags?|z metk\w*|brand new with tags)\b/.test(t)) return 'new_with_tags'
  if (/\b(new|nowy|nowa|nowe|bez metki|new without tags?)\b/.test(t) && !/\blike new\b/.test(t)) return 'new_no_tags'
  if (/\b(like new|excellent|very good|mint|bardzo dobr\w*|idealn\w*)\b/.test(t)) return 'very_good'
  if (/\b(good|dobr\w*)\b/.test(t)) return 'good'
  if (/\b(fair|satisfactory|worn|used|ok|zadowalaj\w*|uzywan\w*)\b/.test(t)) return 'satisfactory'
  return undefined
}

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Dates as other apps and spreadsheets write them: 2024-03-15 (with or without a time),
 * 15.03.2024, 15/03/2024 (day first, unless the first number can't be a month... or day),
 * 03/15/2024, 2024-03, 2024, or an Excel serial number. Future dates are ignored.
 */
export function parseFlexibleDate(text: string, today: DateKey): DateKey | undefined {
  const t = text.trim()
  if (!t) return undefined
  let key: string | undefined
  let m: RegExpMatchArray | null
  if ((m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) key = `${m[1]}-${pad(+m[2]!)}-${pad(+m[3]!)}`
  else if ((m = t.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/))) {
    let [day, month] = [+m[1]!, +m[2]!]
    if (month > 12 && day <= 12) [day, month] = [month, day] // 03/15/2024: month first
    key = `${m[3]}-${pad(month)}-${pad(day)}`
  } else if ((m = t.match(/^(\d{4})[-/.](\d{1,2})$/))) key = `${m[1]}-${pad(+m[2]!)}-01`
  else if ((m = t.match(/^(\d{4})$/))) key = `${m[1]}-01-01`
  else if ((m = t.match(/^(\d{5})(\.\d+)?$/))) {
    // Excel stores dates as days since 30 December 1899
    key = addDays('1899-12-30', +m[1]!)
  }
  if (!key || !isDateKey(key) || key > today || key < '1950-01-01') return undefined
  return key
}

const CURRENCY_HINTS: [CurrencyCode, RegExp][] = [
  ['PLN', /(zł|zl\b|pln)/i],
  ['EUR', /(€|eur)/i],
  ['CZK', /(kč|kc\b|czk)/i],
  ['GBP', /(£|gbp)/i],
  ['USD', /(\$|usd)/i],
]

/** A price cell such as "349 zł", "€84,50", "1 299.00 PLN" or "49". */
export function parsePriceCell(text: string): { amount: number; currency?: CurrencyCode } | undefined {
  const t = text.trim()
  if (!t) return undefined
  const currency = CURRENCY_HINTS.find(([, re]) => re.test(t))?.[0]
  const amount = parsePriceInput(t.replace(/[^\d.,\s ]/g, ''))
  if (amount === undefined || amount === null) return undefined
  return { amount, currency }
}

export function parseCount(text: string): number | undefined {
  const digits = text.replace(/[^\d]/g, '')
  if (!digits) return undefined
  return Math.min(10_000, parseInt(digits, 10))
}

// ---- rows -> pieces -------------------------------------------------------------------------

export type ImportedItem = Pick<Item, 'name' | 'category'> &
  Partial<Pick<Item, 'colour' | 'brand' | 'size' | 'price' | 'purchaseDate' | 'seasons' | 'condition' | 'notes' | 'priorWears'>>

export interface ImportPiece {
  /** Spreadsheet row number (the header is row 1). */
  row: number
  item: ImportedItem
  /** Becomes one logged wear on that day, so "last worn" and nudges start from the right place. */
  lastWorn?: DateKey
  /** Same name as a piece already in WearWell. */
  duplicate: boolean
  /** The category text wasn't recognised, so the piece went to "Other". */
  categoryGuessed: boolean
}

export interface ImportResult {
  pieces: ImportPiece[]
  skipped: { row: number; reason: 'noName' }[]
}

export interface ImportOptions {
  currency: CurrencyCode
  today: DateKey
  /** Names already in the wardrobe, normalised with normalizeSearch. */
  existingNames: ReadonlySet<string>
  /** Name for a row that has a category but no name, e.g. "T-shirt". */
  nameForCategory: (category: CategoryId) => string
}

export function buildImport(rows: readonly string[][], mapping: ColumnMapping, opts: ImportOptions): ImportResult {
  const pieces: ImportPiece[] = []
  const skipped: ImportResult['skipped'] = []
  const cell = (row: readonly string[], field: ImportField) => {
    const i = mapping[field]
    return i === undefined ? '' : (row[i] ?? '').trim()
  }

  rows.forEach((row, index) => {
    const rowNumber = index + 2
    const categoryText = cell(row, 'category')
    const { category, recognised } = matchCategory(categoryText || cell(row, 'name'))
    const name = cell(row, 'name') || (categoryText ? opts.nameForCategory(category) : '')
    if (!name) {
      skipped.push({ row: rowNumber, reason: 'noName' })
      return
    }

    const priceCell = parsePriceCell(cell(row, 'price'))
    const currencyText = cell(row, 'currency').toUpperCase()
    const currency = isCurrencyCode(currencyText) ? currencyText : (priceCell?.currency ?? opts.currency)
    const price: Money | undefined = priceCell ? { amount: priceCell.amount, currency } : undefined
    const lastWorn = parseFlexibleDate(cell(row, 'lastWorn'), opts.today)
    const timesWorn = parseCount(cell(row, 'timesWorn')) ?? 0
    // the "last worn" day becomes a real logged wear, so it isn't counted twice
    const priorWears = Math.max(0, timesWorn - (lastWorn ? 1 : 0))

    const item: ImportedItem = {
      name: name.slice(0, 120),
      category,
      colour: matchColour(cell(row, 'colour')),
      brand: cell(row, 'brand').slice(0, 60) || undefined,
      size: cell(row, 'size').slice(0, 30) || undefined,
      price,
      purchaseDate: parseFlexibleDate(cell(row, 'purchaseDate'), opts.today),
      seasons: matchSeasons(cell(row, 'seasons')),
      condition: matchCondition(cell(row, 'condition')),
      notes: cell(row, 'notes').slice(0, 1000) || undefined,
      priorWears: priorWears > 0 ? priorWears : undefined,
    }
    for (const k of Object.keys(item) as (keyof ImportedItem)[]) if (item[k] === undefined) delete item[k]

    pieces.push({
      row: rowNumber,
      item,
      lastWorn,
      duplicate: opts.existingNames.has(normalizeSearch(name)),
      categoryGuessed: !recognised,
    })
  })

  return { pieces, skipped }
}

/** A starter file for people coming from a spreadsheet. */
export const CSV_TEMPLATE = [
  'name,category,colour,brand,size,price,currency,purchase date,seasons,condition,times worn,last worn,notes',
  'White T-shirt,T-shirt,white,COS,M,59,PLN,2025-03-15,all year,good,24,2026-10-01,',
  'Wool coat,coat,camel,,38,899,PLN,2024-11-02,autumn winter,very good,30,,"Dry clean only"',
  'Black ankle boots,boots,black,,38,450,PLN,2023-10-20,"autumn, winter",good,,,',
].join('\r\n')
