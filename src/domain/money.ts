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

/**
 * Read a price typed by a person: "129", "49,90", "1 299,00", "49.9". Empty means "no price
 * yet" (undefined); anything else that is not a non-negative number is null (invalid).
 */
export function parsePriceInput(text: string): number | undefined | null {
  let s = text.trim().replace(/[\s ]/g, '')
  if (s === '') return undefined
  // "1.299,50" (dot thousands, comma decimals) and "1,299.50" both work
  if (s.includes(',') && s.includes('.')) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  } else {
    s = s.replace(',', '.')
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null
  return roundMoney(Number(s))
}

/** Round to the currency's minor unit (all supported currencies use 2 decimals). */
export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100
}
