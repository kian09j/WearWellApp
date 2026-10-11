import type { Condition, CurrencyCode, DateKey, Item, Money } from './types'
import { daysBetween } from './dates'

// A starting point for a second-hand price, never a promise:
//   price paid × condition factor × age factor, shown as a range of ±15%,
//   rounded to the kind of numbers people actually use on Vinted.

export const CONDITION_FACTOR: Record<Condition, number> = {
  new_with_tags: 0.6,
  new_no_tags: 0.5,
  very_good: 0.4,
  good: 0.3,
  satisfactory: 0.2,
}
/** When the condition is not set, assume somewhere between good and very good. */
export const UNKNOWN_CONDITION_FACTOR = 0.35
/** 10% less per year of age, never below half. */
export const AGE_LOSS_PER_YEAR = 0.1
export const MIN_AGE_FACTOR = 0.5
/** When the purchase date is unknown, assume about a year and a half. */
export const UNKNOWN_AGE_FACTOR = 0.85
export const RANGE = 0.15

const STEPS: Record<CurrencyCode, { small: number; large: number; threshold: number; min: number }> = {
  PLN: { small: 1, large: 5, threshold: 50, min: 5 },
  EUR: { small: 1, large: 5, threshold: 50, min: 1 },
  GBP: { small: 1, large: 5, threshold: 50, min: 1 },
  USD: { small: 1, large: 5, threshold: 50, min: 1 },
  CZK: { small: 10, large: 50, threshold: 500, min: 20 },
}

function friendly(amount: number, currency: CurrencyCode): number {
  const s = STEPS[currency]
  const step = amount < s.threshold ? s.small : s.large
  return Math.max(s.min, Math.round(amount / step) * step)
}

export function ageFactor(purchaseDate: DateKey | undefined, today: DateKey): number {
  if (!purchaseDate) return UNKNOWN_AGE_FACTOR
  const years = Math.max(0, daysBetween(purchaseDate, today)) / 365
  return Math.max(MIN_AGE_FACTOR, 1 - AGE_LOSS_PER_YEAR * years)
}

export interface PriceSuggestion {
  low: Money
  high: Money
  /** The middle of the range, used to prefill the sale price. */
  mid: Money
  conditionKnown: boolean
  ageKnown: boolean
}

export function suggestResalePrice(
  item: Pick<Item, 'price' | 'purchaseDate' | 'condition'>,
  today: DateKey,
): PriceSuggestion | null {
  if (!item.price || item.price.amount <= 0) return null
  const { currency } = item.price
  const cond = item.condition ? CONDITION_FACTOR[item.condition] : UNKNOWN_CONDITION_FACTOR
  const raw = item.price.amount * cond * ageFactor(item.purchaseDate, today)
  const low = friendly(raw * (1 - RANGE), currency)
  let high = friendly(raw * (1 + RANGE), currency)
  if (high <= low) high = low + (raw < STEPS[currency].threshold ? STEPS[currency].small : STEPS[currency].large)
  return {
    low: { amount: low, currency },
    high: { amount: high, currency },
    mid: { amount: friendly(raw, currency), currency },
    conditionKnown: !!item.condition,
    ageKnown: !!item.purchaseDate,
  }
}

/** Money recovered from sales, per currency. */
export function moneyRecovered(items: readonly Item[]): Map<CurrencyCode, { amount: number; sold: number }> {
  const totals = new Map<CurrencyCode, { amount: number; sold: number }>()
  for (const item of items) {
    if (item.kind !== 'owned' || item.status !== 'sold' || !item.sale) continue
    const t = totals.get(item.sale.currency) ?? { amount: 0, sold: 0 }
    t.amount = Math.round((t.amount + item.sale.amount) * 100) / 100
    t.sold++
    totals.set(item.sale.currency, t)
  }
  return totals
}
