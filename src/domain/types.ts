// Core data model. Every stored record carries an id, timestamps and an optional
// deletedAt tombstone so a sync backend can be added later without changing screens.

export type CurrencyCode = 'PLN' | 'EUR' | 'CZK' | 'GBP' | 'USD'

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export type CategoryId =
  | 'tshirts'
  | 'shirts'
  | 'knitwear'
  | 'sweatshirts'
  | 'dresses'
  | 'skirts'
  | 'trousers'
  | 'jeans'
  | 'shorts'
  | 'jackets'
  | 'coats'
  | 'blazers'
  | 'activewear'
  | 'shoes'
  | 'bags'
  | 'accessories'
  | 'other'

export type ColourId =
  | 'black'
  | 'white'
  | 'cream'
  | 'grey'
  | 'navy'
  | 'blue'
  | 'lightblue'
  | 'green'
  | 'khaki'
  | 'beige'
  | 'brown'
  | 'red'
  | 'burgundy'
  | 'pink'
  | 'purple'
  | 'yellow'
  | 'orange'
  | 'multi'

/** Vinted's condition scale, so generated listings map one to one. */
export type Condition = 'new_with_tags' | 'new_no_tags' | 'very_good' | 'good' | 'satisfactory'

export type ItemStatus =
  | 'active'
  | 'occasion'
  | 'sentimental'
  | 'archived'
  | 'listed'
  | 'sold'
  | 'donated'

export type KeepReason = 'occasion' | 'sentimental' | 'other'

export interface Money {
  amount: number
  currency: CurrencyCode
}

/** Local calendar date, 'YYYY-MM-DD'. Never a UTC timestamp, so midnight is never off by one. */
export type DateKey = string

/** ISO timestamp, used for createdAt / updatedAt / deletedAt. */
export type Timestamp = string

export interface SyncFields {
  id: string
  createdAt: Timestamp
  updatedAt: Timestamp
  deletedAt?: Timestamp
}

export interface Item extends SyncFields {
  kind: 'owned' | 'wishlist'
  name: string
  category: CategoryId
  colour?: ColourId
  /** Empty (or all four) means all-year. */
  seasons: Season[]
  price?: Money
  purchaseDate?: DateKey
  brand?: string
  size?: string
  condition?: Condition
  notes?: string
  photoId?: string
  status: ItemStatus
  favourite: boolean
  /** Created by the quick count; shown with an "add details" hint. */
  placeholder: boolean
  /** Part of the sample wardrobe; removable in one tap. */
  sample: boolean
  sale?: Money & { date: DateKey }
  nudge?: {
    snoozedUntil?: DateKey
    pausedUntil?: DateKey
    keepReason?: KeepReason
  }
  wishlist?: {
    wearsPerMonth: number
    coolingOffUntil?: DateKey
  }
}

export interface WearLog extends SyncFields {
  itemId: string
  date: DateKey
  outfitId?: string
  sample: boolean
}

export interface Outfit extends SyncFields {
  name: string
  itemIds: string[]
  sample: boolean
}

export interface Photo {
  id: string
  createdAt: Timestamp
  /** Raw image bytes. ArrayBuffer rather than Blob: stores reliably in every WebView. */
  bytes: ArrayBuffer
  type: string
  width: number
  height: number
}

export interface NudgeThresholds {
  stage1: number
  stage2: number
  stage3: number
}

export interface Settings {
  id: 'settings'
  currency: CurrencyCode
  vintedCountry: string
  listingLanguage: 'en' | 'pl'
  nudgesEnabled: boolean
  nudgeDays: NudgeThresholds
  /** Target cost per wear per category, in the default currency. */
  targetCpw: Partial<Record<CategoryId, number>>
  coolingOff: boolean
  reminder: { enabled: boolean; time: string }
  onboarded: boolean
  /** Pieces skipped with "Not today" on the rediscovery card, reset each day. */
  rediscovery?: { date: DateKey; skipped: string[] }
  updatedAt: Timestamp
}
