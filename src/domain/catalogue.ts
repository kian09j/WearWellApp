import type { CategoryId, DateKey, Item, ItemStatus } from './types'
import { isInSeason } from './dates'
import { wearStat, type WearIndex } from './wearStats'

export type WardrobeView = 'wardrobe' | 'archived' | 'gone'

/** Which statuses each wardrobe view shows. Listed pieces are still in the wardrobe until sold. */
export const VIEW_STATUSES: Record<WardrobeView, readonly ItemStatus[]> = {
  wardrobe: ['active', 'occasion', 'sentimental', 'listed'],
  archived: ['archived'],
  gone: ['sold', 'donated'],
}

export type SortKey = 'recent' | 'name' | 'mostWorn' | 'leastWorn'

export interface CatalogueFilter {
  view: WardrobeView
  category?: CategoryId
  /** Only pieces in season on this date. */
  inSeasonOn?: DateKey
  query?: string
}

/** Lower case, accents removed, so "zolty" finds "żółty" and "cafe" finds "Café". */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'l')
    .toLowerCase()
    .trim()
}

export function filterItems(items: readonly Item[], f: CatalogueFilter): Item[] {
  const statuses = VIEW_STATUSES[f.view]
  const q = f.query ? normalizeSearch(f.query) : ''
  return items.filter(
    (i) =>
      i.kind === 'owned' &&
      statuses.includes(i.status) &&
      (!f.category || i.category === f.category) &&
      (!f.inSeasonOn || isInSeason(i.seasons, f.inSeasonOn)) &&
      (!q || normalizeSearch(`${i.name} ${i.brand ?? ''}`).includes(q)),
  )
}

const byName = (a: Item, b: Item) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })

export function sortItems(items: readonly Item[], key: SortKey, wears: WearIndex): Item[] {
  const sorted = [...items]
  switch (key) {
    case 'recent':
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || byName(a, b))
    case 'name':
      return sorted.sort(byName)
    case 'mostWorn':
      return sorted.sort((a, b) => {
        const sa = wearStat(wears, a.id)
        const sb = wearStat(wears, b.id)
        return sb.count - sa.count || (sb.last ?? '').localeCompare(sa.last ?? '') || byName(a, b)
      })
    case 'leastWorn':
      return sorted.sort((a, b) => {
        const sa = wearStat(wears, a.id)
        const sb = wearStat(wears, b.id)
        return sa.count - sb.count || (sa.last ?? '').localeCompare(sb.last ?? '') || byName(a, b)
      })
  }
}

/** "Jeans 3", "Jeans 4"…: numbering continues after pieces already in that category. */
export function placeholderNames(singular: string, count: number, existing: number): string[] {
  return Array.from({ length: count }, (_, i) => `${singular} ${existing + i + 1}`)
}
