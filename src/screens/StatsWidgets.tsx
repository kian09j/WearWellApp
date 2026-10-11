import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { CurrencyCode } from '../domain/types'
import { colourDef } from '../domain/colours'
import type { ColourShare, Ranked } from '../domain/stats'
import { formatMoney, t } from '../i18n'
import { ItemThumb } from '../ui/ItemThumb'

/** Stat tile: label, value, one line of context. */
export function StatTile({ label, value, meta, children }: { label: string; value: ReactNode; meta?: ReactNode; children?: ReactNode }) {
  return (
    <div className="card-soft flex flex-col p-4">
      <p className="text-[13px] font-semibold text-muted">{label}</p>
      <p className="mt-1 font-display text-[1.7rem] leading-tight lining-nums tabular-nums">{value}</p>
      {children}
      {meta && <p className="mt-1 text-[12.5px] text-muted">{meta}</p>}
    </div>
  )
}

export function StatSection({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="label-caps px-1">{title}</h2>
      {hint && <p className="mt-0.5 mb-2.5 px-1 text-[13px] text-muted">{hint}</p>}
      {!hint && <div className="mb-2.5" />}
      {children}
    </section>
  )
}

/** A short ranked list of pieces with one number each. */
export function RankedList({ rows, value }: { rows: Ranked[]; value: (r: Ranked) => string }) {
  return (
    <ol className="card-soft divide-y divide-thread overflow-hidden">
      {rows.map((r, i) => (
        <li key={r.item.id}>
          <Link to={`/item/${r.item.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-sand/50">
            <span className="w-4 shrink-0 text-center text-[13px] font-semibold text-muted tabular-nums">{i + 1}</span>
            <span className="h-11 w-9 shrink-0 overflow-hidden rounded-xl bg-card" aria-hidden="true">
              <ItemThumb item={r.item} iconSize={20} />
            </span>
            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{r.item.name}</span>
            <span className="shrink-0 text-[14px] tabular-nums">{value(r)}</span>
          </Link>
        </li>
      ))}
    </ol>
  )
}

const LIGHT = new Set(['white', 'cream', 'beige', 'yellow', 'pink', 'lightblue'])

/**
 * Horizontal bars, one per colour, longest first. Each bar wears the garment colour it
 * stands for (the colour IS the data), and every bar is labelled in text, so nothing relies
 * on colour alone. Bars are 14px thick with a rounded data end, square at the baseline.
 */
export function ColourBars({ shares }: { shares: ColourShare[] }) {
  const max = Math.max(1, ...shares.map((s) => s.count))
  return (
    <ul className="card-soft flex flex-col gap-2.5 px-4 py-4">
      {shares.map((s) => {
        const label = s.colour === 'none' ? t('stats.noColour') : t(`colours.${s.colour}`)
        const hex = s.colour === 'none' ? undefined : colourDef(s.colour).hex
        const fill =
          s.colour === 'none'
            ? 'repeating-linear-gradient(45deg, rgb(42 29 24 / 0.25) 0 2px, transparent 2px 6px)'
            : s.colour === 'multi'
              ? 'linear-gradient(90deg, #C73E22, #F2B53A, #3E7A4F, #4F72C9, #C9B6E4)'
              : hex
        return (
          <li key={s.colour} className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate text-[13.5px]">{label}</span>
            <span className="relative h-3.5 flex-1" aria-hidden="true">
              <span
                className="absolute inset-y-0 left-0 rounded-r-[4px]"
                style={{
                  width: `${(s.count / max) * 100}%`,
                  background: fill,
                  // a hairline so white and cream bars stay visible on the cream card
                  boxShadow: LIGHT.has(s.colour) ? 'inset 0 0 0 1px rgb(42 29 24 / 0.18)' : undefined,
                }}
              />
            </span>
            <span className="w-7 shrink-0 text-right text-[13.5px] font-semibold tabular-nums">{s.count}</span>
          </li>
        )
      })}
    </ul>
  )
}

export function moneyList(values: { amount: number; currency: CurrencyCode }[]): string {
  return values.map((v) => formatMoney(v)).join(' + ')
}
