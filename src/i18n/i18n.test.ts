import { beforeAll, describe, expect, it } from 'vitest'
import { configureI18n, formatDate, formatMoney, selectPlural, t } from './index'

beforeAll(() => configureI18n({ language: 'en', formatLocale: 'pl-PL' }))

// Intl uses non-breaking spaces between amount and currency
const plain = (s: string) => s.replace(/\s/g, ' ')

describe('i18n', () => {
  it('translates and interpolates', () => {
    expect(t('settings.version', { version: '1.2.3' })).toBe('Version 1.2.3')
  })

  it('picks English plural forms', () => {
    expect(t('common.items', { count: 1 })).toBe('1 item')
    expect(t('common.items', { count: 3 })).toBe('3 items')
    expect(t('common.items', { count: 0 })).toBe('0 items')
  })

  it('supports Polish plural forms for future translations', () => {
    const entry = { one: 'one', few: 'few', many: 'many', other: 'other' }
    expect(selectPlural(entry, 1, 'pl')).toBe('one')
    expect(selectPlural(entry, 3, 'pl')).toBe('few')
    expect(selectPlural(entry, 5, 'pl')).toBe('many')
    expect(selectPlural(entry, 22, 'pl')).toBe('few')
    expect(selectPlural(entry, 1.5, 'pl')).toBe('other')
  })

  it('formats money in the user locale, dropping decimals only for whole amounts', () => {
    expect(plain(formatMoney({ amount: 349, currency: 'PLN' }))).toBe('349 zł')
    expect(plain(formatMoney({ amount: 12.5, currency: 'PLN' }))).toBe('12,50 zł')
    expect(plain(formatMoney({ amount: 20, currency: 'EUR' }))).toBe('20 €')
  })

  it('formats dates in the user locale', () => {
    expect(formatDate('2026-10-10', 'short')).toBe('10.10.2026')
    configureI18n({ formatLocale: 'en-GB' })
    expect(formatDate('2026-10-10', 'short')).toBe('10/10/2026')
    configureI18n({ formatLocale: 'pl-PL' })
  })
})
