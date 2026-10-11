import type { CategoryId, DateKey, Item } from './types'
import { VIEW_STATUSES, type WardrobeView } from './statuses'
import { cpwSortKey } from './cpw'
import { isInSeason } from './dates'
import { wearStat, type WearIndex } from './wearStats'

export { VIEW_STATUSES, type WardrobeView } from './statuses'

export type SortKey = 'recent' | 'name' | 'mostWorn' | 'leastWorn' | 'cpwLow' | 'cpwHigh'

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
    case 'cpwLow':
    case 'cpwHigh': {
      // pieces without a price always go last; unworn priced pieces count as their full price
      const dir = key === 'cpwLow' ? 1 : -1
      return sorted.sort((a, b) => {
        const [ta, va] = cpwSortKey(a, wearStat(wears, a.id).count)
        const [tb, vb] = cpwSortKey(b, wearStat(wears, b.id).count)
        if ((ta === 2) !== (tb === 2)) return ta === 2 ? 1 : -1
        const tierOrder = key === 'cpwLow' ? ta - tb : tb - ta
        return tierOrder || dir * (va - vb) || byName(a, b)
      })
    }
  }
}

/** "Jeans 3", "Jeans 4"…: numbering continues after pieces already in that category. */
export function placeholderNames(singular: string, count: number, existing: number): string[] {
  return Array.from({ length: count }, (_, i) => `${singular} ${existing + i + 1}`)
}
