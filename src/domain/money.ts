import type { CurrencyCode, Money } from './types'

export const CURRENCIES: readonly CurrencyCode[] = ['PLN', 'EUR', 'CZK', 'GBP', 'USD']

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && (CURRENCIES as readonly string[]).includes(value)
}

export function isMoney(value: unknown): value is Money {
  if (!value || typeof value !== 'object') return false
  const m = value as Record<string, unknown>
  return typeof m.amount === 'number' && Number.isFinite(m.amount) && m.amount >= 0 && isCurrencyCode(m.currency)
}

/** Round to the currency's minor unit (all supported currencies use 2 decimals). */
export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100
}
