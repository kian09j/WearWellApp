import type { CategoryId, CurrencyCode, Item, Money } from './types'
import { VIEW_STATUSES } from './statuses'
import { roundMoney } from './money'
import { wearStat, type WearIndex } from './wearStats'

// Cost per wear (CPW) = what you paid / times worn.
// Groups (a category, the whole wardrobe) add up what their priced pieces cost and divide by
// how often those pieces were worn. Unworn priced pieces still add their cost, which keeps the
// number honest without singling any piece out. Pieces without a price are left out.
// Prices in different currencies are never mixed: groups are per currency.

export type CpwResult =
  | { kind: 'noPrice' }
  | { kind: 'notWorn'; price: Money }
  | { kind: 'cpw'; value: Money; price: Money; wears: number }

export function itemCpw(item: Pick<Item, 'price'>, wears: number): CpwResult {
  if (!item.price) return { kind: 'noPrice' }
  if (wears <= 0) return { kind: 'notWorn', price: item.price }
  return { kind: 'cpw', value: { amount: roundMoney(item.price.amount / wears), currency: item.price.currency }, price: item.price, wears }
}

/** What the cost per wear becomes after one more wear. */
export function cpwAfterNextWear(price: Money, wears: number): Money {
  return { amount: roundMoney(price.amount / (wears + 1)), currency: price.currency }
}

/** Wears still needed for spent / wears to drop to the target or below. */
export function wearsToTarget(spent: number, wears: number, target: number): number {
  if (target <= 0) return 0
  return Math.max(0, Math.ceil(spent / target - 1e-9) - wears)
}

/** Pieces that count in averages: owned and still in the wardrobe. */
export function countsForCpw(item: Item): boolean {
  return item.kind === 'owned' && VIEW_STATUSES.wardrobe.includes(item.status)
}

export interface CpwGroup {
  currency: CurrencyCode
  /** Total paid for the priced pieces. */
  spent: number
  /** Total wears of the priced pieces. */
  wears: number
  priced: number
  /** spent / wears, undefined while nothing priced has been worn. */
  cpw?: number
}

function emptyGroup(currency: CurrencyCode): CpwGroup {
  return { currency, spent: 0, wears: 0, priced: 0 }
}

function finish(g: CpwGroup): CpwGroup {
  g.spent = roundMoney(g.spent)
  if (g.wears > 0) g.cpw = roundMoney(g.spent / g.wears)
  return g
}

/** Whole-wardrobe totals, one group per currency used. */
export function wardrobeCpw(items: readonly Item[], wears: WearIndex): Map<CurrencyCode, CpwGroup> {
  const groups = new Map<CurrencyCode, CpwGroup>()
  for (const item of items) {
    if (!countsForCpw(item) || !item.price) continue
    const g = groups.get(item.price.currency) ?? emptyGroup(item.price.currency)
    g.spent += item.price.amount
    g.wears += wearStat(wears, item.id).count
    g.priced++
    groups.set(item.price.currency, g)
  }
  for (const g of groups.values()) finish(g)
  return groups
}

export interface CategoryCpw extends CpwGroup {
  category: CategoryId
  /** Pieces in the category, priced or not. */
  pieces: number
  /** Wears of all its pieces, priced or not (for display; CPW uses only priced ones). */
  totalWears: number
}

/** Per-category totals for one currency; categories with no pieces are left out. */
export function categoryCpw(items: readonly Item[], wears: WearIndex, currency: CurrencyCode): Map<CategoryId, CategoryCpw> {
  const groups = new Map<CategoryId, CategoryCpw>()
  for (const item of items) {
    if (!countsForCpw(item)) continue
    if (item.price && item.price.currency !== currency) continue
    const g = groups.get(item.category) ?? { ...emptyGroup(currency), category: item.category, pieces: 0, totalWears: 0 }
    const worn = wearStat(wears, item.id).count
    g.pieces++
    g.totalWears += worn
    if (item.price) {
      g.spent += item.price.amount
      g.wears += worn
      g.priced++
    }
    groups.set(item.category, g)
  }
  for (const g of groups.values()) finish(g)
  return groups
}

export interface TargetProgress {
  reached: boolean
  /** 0 to 1, how far along the wears needed for the target are. */
  ratio: number
  wearsNeeded: number
}

export function targetProgress(spent: number, wears: number, target: number): TargetProgress {
  const total = target > 0 ? Math.ceil(spent / target - 1e-9) : 0
  const needed = wearsToTarget(spent, wears, target)
  return { reached: needed === 0, ratio: total === 0 ? 1 : Math.min(1, wears / total), wearsNeeded: needed }
}

/**
 * Sort key for "cost per wear" ordering: worn pieces by their CPW, then unworn priced pieces
 * (whose CPW is still the full price), then pieces without a price.
 */
export function cpwSortKey(item: Pick<Item, 'price'>, wears: number): [tier: number, value: number] {
  if (!item.price) return [2, 0]
  if (wears === 0) return [1, item.price.amount]
  return [0, item.price.amount / wears]
}
