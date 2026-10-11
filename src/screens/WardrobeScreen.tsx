import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ListChecks, Plus, Search } from 'lucide-react'
import type { CategoryId } from '../domain/types'
import { useItems, useWears } from '../data'
import { CATEGORIES, isCategoryId } from '../domain/categories'
import { filterItems, sortItems, VIEW_STATUSES, type SortKey, type WardrobeView } from '../domain/catalogue'
import { today } from '../domain/dates'
import { buildWearIndex, wearStat } from '../domain/wearStats'
import { moneyRecovered } from '../domain/resale'
import { formatMoney, t, type TKey } from '../i18n'
import { Button } from '../ui/Button'
import { Flower } from '../ui/Flower'
import { ItemTile } from '../ui/ItemThumb'
import { Screen } from '../ui/Screen'
import { QuickAddSheet } from './QuickAddSheet'
import { useNudges } from './useNudges'

const VIEWS: { id: WardrobeView; label: TKey }[] = [
  { id: 'wardrobe', label: 'wardrobe.viewWardrobe' },
  { id: 'archived', label: 'wardrobe.viewArchived' },
  { id: 'gone', label: 'wardrobe.viewGone' },
]

const SORTS: { id: SortKey; label: TKey }[] = [
  { id: 'recent', label: 'wardrobe.sortRecent' },
  { id: 'name', label: 'wardrobe.sortName' },
  { id: 'mostWorn', label: 'wardrobe.sortMostWorn' },
  { id: 'leastWorn', label: 'wardrobe.sortLeastWorn' },
  { id: 'cpwLow', label: 'wardrobe.sortCpwLow' },
  { id: 'cpwHigh', label: 'wardrobe.sortCpwHigh' },
]

const chip =
  'flex min-h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] px-3.5 text-[13.5px] font-semibold whitespace-nowrap transition-colors'
const chipOff = 'border-ink/12 bg-card text-ink/80 hover:border-ink/30'
const chipOn = 'border-ink bg-ink text-card'

export function WardrobeScreen() {
  const items = useItems()
  const wears = useWears()
  const [params, setParams] = useSearchParams()
  const [adding, setAdding] = useState(false)

  // Filters live in the URL, so coming back from a piece keeps them.
  const view = (VIEWS.find((v) => v.id === params.get('view'))?.id ?? 'wardrobe') as WardrobeView
  const catParam = params.get('cat')
  const category: CategoryId | undefined = isCategoryId(catParam) ? catParam : undefined
  const inSeason = params.get('season') === '1'
  const waiting = params.get('wait') === '1' && view === 'wardrobe'
  const query = params.get('q') ?? ''
  const nudges = useNudges()
  const sort = (SORTS.find((s) => s.id === params.get('sort'))?.id ?? 'recent') as SortKey

  const set = (key: string, value: string | undefined) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )
  }

  const wearIndex = useMemo(() => buildWearIndex(wears ?? [], items ?? []), [wears, items])
  const owned = useMemo(() => (items ?? []).filter((i) => i.kind === 'owned'), [items])
  const inView = useMemo(() => owned.filter((i) => VIEW_STATUSES[view].includes(i.status)), [owned, view])
  const presentCategories = useMemo(() => CATEGORIES.filter((c) => inView.some((i) => i.category === c.id)), [inView])
  const shown = useMemo(
    () =>
      sortItems(
        filterItems(owned, { view, category, inSeasonOn: inSeason ? today() : undefined, query }).filter(
          (i) => !waiting || nudges?.byItem.has(i.id),
        ),
        sort,
        wearIndex,
      ),
    [owned, view, category, inSeason, query, sort, wearIndex, waiting, nudges],
  )
  const waitingCount = nudges?.all.length ?? 0
  const recovered = useMemo(
    () => [...moneyRecovered(items ?? []).entries()].map(([currency, r]) => ({ amount: r.amount, currency })),
    [items],
  )

  if (items === undefined) return <Screen title={t('wardrobe.title')}>{null}</Screen>

  if (owned.length === 0) {
    return (
      <Screen title={t('wardrobe.title')}>
        <section className="card-soft flex flex-col items-center px-6 py-10 text-center">
          <Flower size={64} petal="var(--color-chaber)" inner="var(--color-card)" />
          <h2 className="mt-5 text-[1.7rem] leading-tight">{t('wardrobe.emptyTitle')}</h2>
          <p className="mt-2 max-w-xs text-muted">{t('wardrobe.emptyBody')}</p>
          <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
            <Link
              to="/welcome/count"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-mak px-6 text-[15px] font-semibold text-card hover:bg-mak-strong"
            >
              <ListChecks size={18} aria-hidden="true" />
              {t('wardrobe.quickCount')}
            </Link>
            <Button variant="ghost" icon={<Plus size={18} aria-hidden="true" />} onClick={() => setAdding(true)}>
              {t('wardrobe.addPiece')}
            </Button>
            <Link to="/import" className="inline-flex min-h-11 items-center justify-center text-[14px] font-semibold text-ink/75 underline underline-offset-4">
              {t('wardrobe.importCsv')}
            </Link>
          </div>
        </section>
        <QuickAddSheet open={adding} onClose={() => setAdding(false)} />
      </Screen>
    )
  }

  return (
    <Screen title={t('wardrobe.title')} eyebrow={t('common.pieces', { count: inView.length })}>
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink/45" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => set('q', e.target.value || undefined)}
          placeholder={t('wardrobe.search')}
          aria-label={t('wardrobe.search')}
          className="min-h-12 w-full rounded-full border-[1.5px] border-ink/35 bg-card pr-4 pl-11 text-[16px] placeholder:text-ink/60 focus:border-mak focus:outline-none"
        />
      </div>

      <fieldset className="mt-3">
        <legend className="sr-only">{t('wardrobe.views')}</legend>
        <div className="grid grid-cols-3 gap-1 rounded-full bg-sand p-1">
          {VIEWS.map((v) => (
            <label key={v.id} className="cursor-pointer">
              <input
                type="radio"
                name="view"
                checked={view === v.id}
                onChange={() => set('view', v.id === 'wardrobe' ? undefined : v.id)}
                className="peer sr-only"
              />
              <span className="flex min-h-10 items-center justify-center rounded-full px-1 text-center text-[13px] leading-tight font-semibold text-ink/70 peer-checked:bg-card peer-checked:text-ink peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-mak">
                {t(v.label)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <button
          type="button"
          aria-pressed={inSeason}
          onClick={() => set('season', inSeason ? undefined : '1')}
          className={`${chip} ${inSeason ? chipOn : chipOff}`}
        >
          {t('wardrobe.inSeason')}
        </button>
        {view === 'wardrobe' && (waitingCount > 0 || waiting) && (
          <button
            type="button"
            aria-pressed={waiting}
            onClick={() => set('wait', waiting ? undefined : '1')}
            className={`${chip} ${waiting ? 'border-ink bg-ink text-card' : 'border-bez bg-tint-bez text-ink hover:border-ink/30'}`}
          >
            {t('nudges.filter')}
            <span className={`rounded-full px-1.5 text-[12px] ${waiting ? 'bg-card/20' : 'bg-card'}`}>{waitingCount}</span>
          </button>
        )}
        <span className="my-2 w-px shrink-0 bg-ink/15" aria-hidden="true" />
        <button
          type="button"
          aria-pressed={!category}
          onClick={() => set('cat', undefined)}
          className={`${chip} ${!category ? chipOn : chipOff}`}
        >
          {t('wardrobe.allCategories')}
        </button>
        {presentCategories.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={category === c.id}
            onClick={() => set('cat', category === c.id ? undefined : c.id)}
            className={`${chip} ${category === c.id ? chipOn : chipOff}`}
          >
            {t(`categories.${c.id}`)}
          </button>
        ))}
      </div>

      <div className="mt-3 mb-3 flex items-center justify-between gap-3">
        <p className="text-[14px] text-muted" aria-live="polite">
          {t('common.pieces', { count: shown.length })}
        </p>
        <label className="flex items-center gap-1.5 text-[14px]">
          <span className="text-muted">{t('wardrobe.sort')}</span>
          <select
            value={sort}
            onChange={(e) => set('sort', e.target.value === 'recent' ? undefined : e.target.value)}
            className="min-h-10 rounded-full bg-transparent pr-1 font-semibold focus:outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {t(s.label)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {waiting && <p className="mb-4 rounded-[18px] bg-tint-bez px-4 py-3 text-[13.5px] text-ink/80">{t('nudges.filterHint', { days: nudges?.stage1Days ?? 30 })}</p>}
      {view === 'gone' && recovered.length > 0 && (
        <p className="mb-4 rounded-[18px] bg-tint-mieta px-4 py-3 text-[14px] font-semibold">
          {t('wardrobe.recovered', { amount: recovered.map((r) => formatMoney(r)).join(' + ') })}
        </p>
      )}

      {waiting && shown.length === 0 ? (
        <p className="card-soft px-6 py-10 text-center text-muted">{t('nudges.filterEmpty')}</p>
      ) : shown.length === 0 ? (
        <p className="card-soft px-6 py-10 text-center text-muted">
          {inView.length === 0
            ? t(view === 'archived' ? 'wardrobe.emptyArchived' : 'wardrobe.emptyGone')
            : t('wardrobe.noMatches')}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-5 pb-16 sm:grid-cols-3">
          {shown.map((item) => (
            <li key={item.id}>
              <ItemTile item={item} wears={wearStat(wearIndex, item.id).count} />
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setAdding(true)}
        className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 inline-flex min-h-14 items-center gap-2 rounded-full bg-mak pr-6 pl-5 text-[15px] font-semibold text-card shadow-lift hover:bg-mak-strong"
      >
        <Plus size={22} strokeWidth={2.4} aria-hidden="true" />
        {t('wardrobe.addPiece')}
      </button>
      <QuickAddSheet open={adding} onClose={() => setAdding(false)} />
    </Screen>
  )
}
