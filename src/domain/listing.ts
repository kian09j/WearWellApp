import type { CategoryId, ColourId, Condition, Item } from './types'
import { fromDateKey } from './dates'

// Ready-to-copy Vinted listing text, in English or Polish. This is generated content in two
// fixed listing languages (not app UI), so the wording lives here rather than in the UI
// translation files. Polish colour adjectives agree with the noun's gender.

export type ListingLanguage = 'en' | 'pl'

type Gender = 'm' | 'f' | 'n' | 'pl'

const PL_NOUN: Record<CategoryId, { noun: string; gender: Gender }> = {
  tshirts: { noun: 'koszulka', gender: 'f' },
  shirts: { noun: 'koszula', gender: 'f' },
  knitwear: { noun: 'sweter', gender: 'm' },
  sweatshirts: { noun: 'bluza', gender: 'f' },
  dresses: { noun: 'sukienka', gender: 'f' },
  skirts: { noun: 'spódnica', gender: 'f' },
  trousers: { noun: 'spodnie', gender: 'pl' },
  jeans: { noun: 'jeansy', gender: 'pl' },
  shorts: { noun: 'szorty', gender: 'pl' },
  jackets: { noun: 'kurtka', gender: 'f' },
  coats: { noun: 'płaszcz', gender: 'm' },
  blazers: { noun: 'marynarka', gender: 'f' },
  activewear: { noun: 'strój sportowy', gender: 'm' },
  shoes: { noun: 'buty', gender: 'pl' },
  bags: { noun: 'torebka', gender: 'f' },
  accessories: { noun: 'dodatek', gender: 'm' },
  other: { noun: 'ubranie', gender: 'n' },
}

/** Adjective stems; endings added per gender. Khaki does not decline and goes after the noun. */
const PL_COLOUR_STEM: Record<Exclude<ColourId, 'khaki'>, { stem: string; soft?: boolean }> = {
  black: { stem: 'czarn' },
  white: { stem: 'biał' },
  cream: { stem: 'kremow' },
  grey: { stem: 'szar' },
  navy: { stem: 'granatow' },
  blue: { stem: 'niebiesk', soft: true },
  lightblue: { stem: 'jasnoniebiesk', soft: true },
  green: { stem: 'zielon' },
  beige: { stem: 'beżow' },
  brown: { stem: 'brązow' },
  red: { stem: 'czerwon' },
  burgundy: { stem: 'bordow' },
  pink: { stem: 'różow' },
  purple: { stem: 'fioletow' },
  yellow: { stem: 'żółt' },
  orange: { stem: 'pomarańczow' },
  multi: { stem: 'wielokolorow' },
}

function plAdjective(colour: Exclude<ColourId, 'khaki'>, gender: Gender): string {
  const { stem, soft } = PL_COLOUR_STEM[colour]
  // after k / g the masculine ending is -i and the others gain an i: niebieski, niebieska, niebieskie
  if (gender === 'm') return stem + (soft ? 'i' : 'y')
  if (gender === 'f') return stem + 'a'
  return stem + (soft ? 'ie' : 'e')
}

const PL_CONDITION: Record<Condition, string> = {
  new_with_tags: 'nowy z metką',
  new_no_tags: 'nowy bez metki',
  very_good: 'bardzo dobry',
  good: 'dobry',
  satisfactory: 'zadowalający',
}

const EN_NOUN: Record<CategoryId, string> = {
  tshirts: 'T-shirt',
  shirts: 'shirt',
  knitwear: 'jumper',
  sweatshirts: 'sweatshirt',
  dresses: 'dress',
  skirts: 'skirt',
  trousers: 'trousers',
  jeans: 'jeans',
  shorts: 'shorts',
  jackets: 'jacket',
  coats: 'coat',
  blazers: 'blazer',
  activewear: 'sportswear',
  shoes: 'shoes',
  bags: 'bag',
  accessories: 'accessory',
  other: 'piece',
}

const EN_COLOUR: Record<ColourId, string> = {
  black: 'black',
  white: 'white',
  cream: 'cream',
  grey: 'grey',
  navy: 'navy',
  blue: 'blue',
  lightblue: 'light blue',
  green: 'green',
  khaki: 'khaki',
  beige: 'beige',
  brown: 'brown',
  red: 'red',
  burgundy: 'burgundy',
  pink: 'pink',
  purple: 'purple',
  yellow: 'yellow',
  orange: 'orange',
  multi: 'multicoloured',
}

const EN_CONDITION: Record<Condition, string> = {
  new_with_tags: 'new with tags',
  new_no_tags: 'new without tags',
  very_good: 'very good',
  good: 'good',
  satisfactory: 'satisfactory',
}

const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1)

function monthYear(key: string, lang: ListingLanguage): string {
  return new Intl.DateTimeFormat(lang === 'pl' ? 'pl' : 'en-GB', { month: 'long', year: 'numeric' }).format(fromDateKey(key))
}

function price(amount: number, currency: string, lang: ListingLanguage): string {
  const whole = Number.isInteger(amount)
  return new Intl.NumberFormat(lang === 'pl' ? 'pl-PL' : 'en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  })
    .format(amount)
    .replace(/[  ]/g, ' ') // plain spaces paste cleanly into any text field
}

/** "Czarna sukienka", "Spodnie w kolorze khaki", "Sweter" */
export function plPhrase(category: CategoryId, colour: ColourId | undefined): string {
  const { noun, gender } = PL_NOUN[category]
  if (!colour) return capitalize(noun)
  if (colour === 'khaki') return `${capitalize(noun)} w kolorze khaki`
  return capitalize(`${plAdjective(colour, gender)} ${noun}`)
}

function enPhrase(category: CategoryId, colour: ColourId | undefined): string {
  return capitalize(colour ? `${EN_COLOUR[colour]} ${EN_NOUN[category]}` : EN_NOUN[category])
}

export interface Listing {
  title: string
  description: string
}

type ListingItem = Pick<Item, 'name' | 'category' | 'colour' | 'brand' | 'size' | 'condition' | 'purchaseDate' | 'price' | 'placeholder'>

export function buildListing(item: ListingItem, lang: ListingLanguage): Listing {
  const brand = item.brand?.trim()
  const size = item.size?.trim()

  if (lang === 'pl') {
    const phrase = plPhrase(item.category, item.colour)
    const title = `${phrase}${brand ? ` ${brand}` : ''}${size ? `, rozm. ${size}` : ''}`
    const lines = [
      `${phrase}${brand ? ` ${brand}` : ''}.`,
      '',
      size && `• Rozmiar: ${size}`,
      item.colour && `• Kolor: ${item.colour === 'khaki' ? 'khaki' : plAdjective(item.colour, 'm')}`,
      item.condition && `• Stan: ${PL_CONDITION[item.condition]}`,
      item.purchaseDate && `• Data zakupu: ${monthYear(item.purchaseDate, 'pl')}`,
      item.price && item.price.amount > 0 && `• Cena w sklepie: ${price(item.price.amount, item.price.currency, 'pl')}`,
      '',
      'Chętnie odpowiem na pytania.',
    ]
    return { title, description: tidy(lines) }
  }

  // English: the person's own name for the piece reads best, unless it is a quick-count placeholder
  const named = !item.placeholder && item.name.trim().length > 0
  const base = named ? item.name.trim() : enPhrase(item.category, item.colour)
  const brandInName = !!brand && base.toLocaleLowerCase().includes(brand.toLocaleLowerCase())
  const title = `${brand && !brandInName ? `${brand} ` : ''}${base}${size ? `, size ${size}` : ''}`
  const lines = [
    `${base}${brand && !brandInName ? ` by ${brand}` : ''}.`,
    '',
    size && `• Size: ${size}`,
    item.colour && `• Colour: ${EN_COLOUR[item.colour]}`,
    item.condition && `• Condition: ${EN_CONDITION[item.condition]}`,
    item.purchaseDate && `• Bought: ${monthYear(item.purchaseDate, 'en')}`,
    item.price && item.price.amount > 0 && `• Original price: ${price(item.price.amount, item.price.currency, 'en')}`,
    '',
    'Questions welcome, just send me a message.',
  ]
  return { title, description: tidy(lines) }
}

/** Drop missing lines and collapse doubled blank lines. */
function tidy(lines: (string | false | undefined | 0)[]): string {
  const kept = lines.filter((l): l is string => typeof l === 'string')
  return kept
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
