import type { CategoryId, Season } from './types'

export interface CategoryDef {
  id: CategoryId
  /** Seasons given to quick-count placeholders, so a coat isn't "neglected" in July. Empty = all-year. */
  defaultSeasons: Season[]
}

// Order is the order shown in the quick count and pickers.
export const CATEGORIES: readonly CategoryDef[] = [
  { id: 'tshirts', defaultSeasons: [] },
  { id: 'shirts', defaultSeasons: [] },
  { id: 'knitwear', defaultSeasons: ['autumn', 'winter', 'spring'] },
  { id: 'sweatshirts', defaultSeasons: [] },
  { id: 'dresses', defaultSeasons: [] },
  { id: 'skirts', defaultSeasons: [] },
  { id: 'trousers', defaultSeasons: [] },
  { id: 'jeans', defaultSeasons: [] },
  { id: 'shorts', defaultSeasons: ['spring', 'summer'] },
  { id: 'jackets', defaultSeasons: ['spring', 'autumn'] },
  { id: 'coats', defaultSeasons: ['autumn', 'winter'] },
  { id: 'blazers', defaultSeasons: [] },
  { id: 'activewear', defaultSeasons: [] },
  { id: 'shoes', defaultSeasons: [] },
  { id: 'bags', defaultSeasons: [] },
  { id: 'accessories', defaultSeasons: [] },
  { id: 'other', defaultSeasons: [] },
]

export const CATEGORY_IDS: readonly CategoryId[] = CATEGORIES.map((c) => c.id)

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === 'string' && (CATEGORY_IDS as readonly string[]).includes(value)
}

export function categoryDef(id: CategoryId): CategoryDef {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]!
}
