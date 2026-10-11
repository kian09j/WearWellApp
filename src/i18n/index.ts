import type { DateKey, Money } from '../domain/types'
import { fromDateKey } from '../domain/dates'
import en from './locales/en'

export type Plural = { zero?: string; one: string; two?: string; few?: string; many?: string; other: string }
type IsPlural<T> = T extends { one: string; other: string } ? true : false

/** The shape every locale file must have: same keys as en.ts, room for extra plural forms. */
export type Messages = Widen<typeof en>
type Widen<T> = {
  [K in keyof T]: T[K] extends string ? string : IsPlural<T[K]> extends true ? Plural : Widen<T[K]>
}

type Paths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : IsPlural<T[K]> extends true
      ? `${P}${K}`
      : Paths<T[K], `${P}${K}.`>
}[keyof T & string]

export type TKey = Paths<typeof en>
export type TVars = Record<string, string | number>

// Every file in ./locales is a language; adding pl.ts is enough to make Polish available.
const modules = import.meta.glob<{ default: Messages }>('./locales/*.ts', { eager: true })
export const LOCALES: Record<string, Messages> = {}
for (const [path, mod] of Object.entries(modules)) {
  const code = /\/([\w-]+)\.ts$/.exec(path)?.[1]
  if (code) LOCALES[code] = mod.default
}

function pickLanguage(preferred: readonly string[]): string {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0]!
    if (LOCALES[base]) return base
  }
  return 'en'
}

const nav = typeof navigator !== 'undefined' ? navigator : undefined
let language = pickLanguage(nav?.languages ?? [])

/** Locale used for dates, numbers and money: the person's own, regardless of UI language. */
let formatLocale = nav?.language || 'en-GB'

export function getLanguage(): string {
  return language
}

/** Test hook and future settings switch. */
export function configureI18n(opts: { language?: string; formatLocale?: string }): void {
  if (opts.language && LOCALES[opts.language]) language = opts.language
  if (opts.formatLocale) formatLocale = opts.formatLocale
  numberFormats.clear()
}

function lookup(messages: unknown, key: string): string | Plural | undefined {
  let node: unknown = messages
  for (const part of key.split('.')) {
    if (!node || typeof node !== 'object') return undefined
    node = (node as Record<string, unknown>)[part]
  }
  return typeof node === 'string' || (node && typeof node === 'object') ? (node as string | Plural) : undefined
}

export function selectPlural(entry: Plural, count: number, lang: string): string {
  const form = new Intl.PluralRules(lang).select(count) as keyof Plural
  return entry[form] ?? entry.other
}

function interpolate(text: string, vars?: TVars): string {
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match))
}

/** Translate a key. Plural entries need a `count` variable. Missing keys fall back to English. */
export function t(key: TKey, vars?: TVars): string {
  let lang = language
  let entry = lookup(LOCALES[lang], key)
  if (entry === undefined) {
    lang = 'en'
    entry = lookup(en, key)
  }
  if (entry === undefined) return key
  const text = typeof entry === 'string' ? entry : selectPlural(entry, Number(vars?.count ?? 0), lang)
  return interpolate(text, vars)
}

const numberFormats = new Map<string, Intl.NumberFormat>()

function numberFormat(key: string, make: () => Intl.NumberFormat): Intl.NumberFormat {
  let f = numberFormats.get(key)
  if (!f) {
    f = make()
    numberFormats.set(key, f)
  }
  return f
}

/** Whole amounts show without decimals (349 zł); fractional ones always with two (12,50 zł). */
export function formatMoney(money: Money): string {
  const whole = Number.isInteger(money.amount)
  return numberFormat(`${money.currency}:${whole}`, () =>
    new Intl.NumberFormat(formatLocale, {
      style: 'currency',
      currency: money.currency,
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    }),
  ).format(money.amount)
}

export function formatNumber(n: number): string {
  return numberFormat('n', () => new Intl.NumberFormat(formatLocale)).format(n)
}

export type DateStyle = 'short' | 'medium' | 'long' | 'dayMonth' | 'weekday'

export function formatDate(key: DateKey, style: DateStyle = 'medium'): string {
  const date = fromDateKey(key)
  const options: Intl.DateTimeFormatOptions =
    style === 'dayMonth'
      ? { day: 'numeric', month: 'short' }
      : style === 'weekday'
        ? { weekday: 'long', day: 'numeric', month: 'long' }
        : { dateStyle: style }
  return new Intl.DateTimeFormat(formatLocale, options).format(date)
}

export function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat(formatLocale, { dateStyle: 'medium' }).format(new Date(iso))
}
