import type { DateKey, Item, WearLog } from './types'
import { VIEW_STATUSES } from './catalogue'
import { addDays } from './dates'
import { wearStat, type WearIndex } from './wearStats'

/** Pieces you can log a wear for: owned and still in the wardrobe (listed ones too, until sold). */
export function isWearable(item: Item): boolean {
  return item.kind === 'owned' && VIEW_STATUSES.wardrobe.includes(item.status)
}

export function wornOn(wears: readonly Pick<WearLog, 'itemId' | 'date'>[], date: DateKey): Set<string> {
  const ids = new Set<string>()
  for (const w of wears) if (w.date === date) ids.add(w.itemId)
  return ids
}

/** What was worn the day before `date`, limited to pieces that can still be worn. */
export function sameAsDayBefore(
  wears: readonly Pick<WearLog, 'itemId' | 'date'>[],
  date: DateKey,
  wearable: ReadonlySet<string>,
): string[] {
  return [...wornOn(wears, addDays(date, -1))].filter((id) => wearable.has(id))
}

/**
 * Order for the Today grid: favourites, then most recently worn, then newest. The first
 * `limit` are shown straight away, plus anything already logged for the day so a tap can be undone.
 */
export function homeGrid(
  items: readonly Item[],
  wears: WearIndex,
  logged: ReadonlySet<string>,
  limit: number,
): { shown: Item[]; total: number } {
  const ordered = items.filter(isWearable).sort((a, b) => {
    if (a.favourite !== b.favourite) return a.favourite ? -1 : 1
    const la = wearStat(wears, a.id).last ?? ''
    const lb = wearStat(wears, b.id).last ?? ''
    return lb.localeCompare(la) || b.createdAt.localeCompare(a.createdAt) || a.name.localeCompare(b.name)
  })
  const shown = ordered.filter((item, i) => i < limit || logged.has(item.id))
  return { shown, total: ordered.length }
}
