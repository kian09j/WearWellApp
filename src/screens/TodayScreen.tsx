import { useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Check, ChevronLeft, ChevronRight, ListChecks, Plus, Repeat, Search, Sparkles } from 'lucide-react'
import type { DateKey, Outfit } from '../domain/types'
import { loadSampleData, logMany, logWear, saveOutfit, unlogMany, unlogWear, useItems, useOutfits, useWears } from '../data'
import { normalizeSearch } from '../domain/catalogue'
import { addDays, isDateKey } from '../domain/dates'
import { homeGrid, isWearable, sameAsDayBefore, wornOn } from '../domain/logging'
import { todaysNudge } from '../domain/nudges'
import { pickRediscovery } from '../domain/rediscovery'
import { loggedDays, streakMessage } from '../domain/streak'
import { makeUnwornContext } from '../domain/unworn'
import { buildWearIndex } from '../domain/wearStats'
import { formatDate, t } from '../i18n'
import { tapFeedback } from '../platform/haptics'
import { Button } from '../ui/Button'
import { Field, TextInput } from '../ui/fields'
import { Flower } from '../ui/Flower'
import { LogTile } from '../ui/LogTile'
import { Screen } from '../ui/Screen'
import { Sheet } from '../ui/Sheet'
import { useToast } from '../ui/Toast'
import { useToday } from '../ui/useToday'
import { RediscoveryCard, useSkippedToday } from './RediscoveryCard'
import { NudgeCard } from './NudgeCard'
import { useNudges } from './useNudges'

const COLLAPSED = 12

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return t('today.greetingMorning')
  if (hour < 18) return t('today.greetingAfternoon')
  return t('today.greetingEvening')
}

function StreakChip({ days, today }: { days: ReadonlySet<DateKey>; today: DateKey }) {
  const message = streakMessage(days, today)
  if (message.kind === 'none') return null
  return (
    <p className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full bg-tint-maslo py-1.5 pr-4 pl-2 text-[14px]">
      <Flower size={22} petal="var(--color-slonecznik)" inner="var(--color-card)" center="var(--color-mak)" />
      {message.kind === 'streak' ? (
        <span>
          <span className="font-semibold">{t('today.streak', { count: message.length })}</span>
          {!message.includesToday && <span className="text-ink/70">, {t('today.streakNext', { next: message.length + 1 })}</span>}
        </span>
      ) : (
        <span>
          <span className="font-semibold">{t('today.monthDays', { count: message.days })}</span>
          {message.best >= 2 && <span className="text-ink/70"> · {t('today.bestStreak', { count: message.best })}</span>}
        </span>
      )}
    </p>
  )
}

function DateSwitcher({ date, today, onChange }: { date: DateKey; today: DateKey; onChange: (d: DateKey) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const label =
    date === today ? t('today.todayLabel') : date === addDays(today, -1) ? t('today.yesterdayLabel') : formatDate(date, 'weekdayShort')
  const arrow = 'flex h-11 w-11 items-center justify-center rounded-full hover:bg-sand disabled:opacity-25'
  return (
    <div className="flex items-center justify-between rounded-full bg-card p-1 shadow-soft">
      <button type="button" className={arrow} onClick={() => onChange(addDays(date, -1))} aria-label={t('today.prevDay')}>
        <ChevronLeft size={22} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => (input.current?.showPicker ? input.current.showPicker() : input.current?.focus())}
        aria-label={t('today.pickDate', { date: formatDate(date, 'weekday') })}
        className="relative min-h-11 flex-1 rounded-full px-3 text-[15px] font-semibold hover:bg-sand"
      >
        {label}
        <input
          ref={input}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          max={today}
          value={date}
          onChange={(e) => isDateKey(e.target.value) && onChange(e.target.value)}
          className="pointer-events-none absolute inset-0 opacity-0"
        />
      </button>
      <button type="button" className={arrow} onClick={() => onChange(addDays(date, 1))} disabled={date >= today} aria-label={t('today.nextDay')}>
        <ChevronRight size={22} aria-hidden="true" />
      </button>
    </div>
  )
}

const chip =
  'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border-[1.5px] px-4 text-[14px] font-semibold whitespace-nowrap transition-colors disabled:opacity-40'

export function TodayScreen() {
  const items = useItems()
  const wears = useWears()
  const outfits = useOutfits()
  const today = useToday()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [expanded, setExpanded] = useState(false)
  const [query, setQuery] = useState('')
  const [outfitSheet, setOutfitSheet] = useState(false)
  const [outfitName, setOutfitName] = useState('')

  // the chosen day lives in the URL so going into a piece and back keeps it
  const dateParam = params.get('date')
  const date = dateParam && isDateKey(dateParam) && dateParam < today ? dateParam : today
  const isToday = date === today
  const setDate = (d: DateKey) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (d >= today) next.delete('date')
        else next.set('date', d)
        return next
      },
      { replace: true },
    )

  const allWears = useMemo(() => wears ?? [], [wears])
  const wearIndex = useMemo(() => buildWearIndex(allWears, items ?? []), [allWears, items])
  const days = useMemo(() => loggedDays(allWears), [allWears])
  const logged = useMemo(() => wornOn(allWears, date), [allWears, date])
  const wearable = useMemo(() => (items ?? []).filter(isWearable), [items])
  const wearableIds = useMemo(() => new Set(wearable.map((i) => i.id)), [wearable])
  const same = useMemo(() => sameAsDayBefore(allWears, date, wearableIds), [allWears, date, wearableIds])
  const sameMissing = same.filter((id) => !logged.has(id))
  const grid = useMemo(() => homeGrid(wearable, wearIndex, logged, expanded ? Infinity : COLLAPSED), [wearable, wearIndex, logged, expanded])
  const shown = expanded && query.trim() ? grid.shown.filter((i) => normalizeSearch(i.name).includes(normalizeSearch(query))) : grid.shown
  const usableOutfits = useMemo(
    () => (outfits ?? []).map((o) => ({ ...o, itemIds: o.itemIds.filter((id) => wearableIds.has(id)) })).filter((o) => o.itemIds.length > 0),
    [outfits, wearableIds],
  )
  const nudges = useNudges()
  const skipped = useSkippedToday(today)
  const rediscovery = useMemo(() => {
    // judged on wears up to yesterday, so wearing the piece today keeps it on the card
    const before = allWears.filter((w) => w.date < today)
    const ctx = makeUnwornContext(today, before, items ?? [])
    return pickRediscovery(items ?? [], buildWearIndex(before, items ?? []), wornOn(allWears, today), ctx, skipped)
  }, [items, allWears, today, skipped])
  const nudge = nudges ? todaysNudge(nudges.all, rediscovery?.item.id) : null
  const loggedList = [...logged].filter((id) => wearableIds.has(id))
  const matchesOutfit = usableOutfits.some((o) => o.itemIds.length === loggedList.length && o.itemIds.every((id) => logged.has(id)))

  if (items === undefined || wears === undefined) return <Screen title={greeting()}>{null}</Screen>

  if (wearable.length === 0) {
    return (
      <Screen eyebrow={formatDate(today, 'weekday')} title={greeting()}>
        <section className="card-soft flex flex-col items-center px-6 py-10 text-center">
          <Flower size={72} />
          <h2 className="mt-5 text-[1.7rem] leading-tight">{t('today.emptyTitle')}</h2>
          <p className="mt-2 max-w-xs text-muted">{t('today.emptyBody')}</p>
          <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
            <Link
              to="/welcome/count"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-mak px-6 text-[15px] font-semibold text-card hover:bg-mak-strong"
            >
              <ListChecks size={18} aria-hidden="true" />
              {t('today.quickCount')}
            </Link>
            <Button variant="ghost" icon={<Sparkles size={18} aria-hidden="true" />} onClick={() => void loadSampleData()}>
              {t('today.loadSample')}
            </Button>
          </div>
        </section>
      </Screen>
    )
  }

  const toggle = async (itemId: string) => {
    tapFeedback()
    if (logged.has(itemId)) await unlogWear(itemId, date)
    else await logWear(itemId, date)
  }

  const logGroup = async (ids: string[], message: string, outfitId?: string) => {
    tapFeedback()
    const added = await logMany(ids, date, outfitId)
    toast(message, added.length ? { label: t('common.undo'), onClick: () => void unlogMany(added, date) } : undefined)
  }

  const toggleOutfit = async (outfit: Outfit) => {
    const allLogged = outfit.itemIds.every((id) => logged.has(id))
    if (!allLogged) return logGroup(outfit.itemIds, t('today.outfitLogged', { name: outfit.name }), outfit.id)
    tapFeedback()
    await unlogMany(outfit.itemIds, date)
    toast(t('today.outfitRemoved', { name: outfit.name }), {
      label: t('common.undo'),
      onClick: () => void logMany(outfit.itemIds, date, outfit.id),
    })
  }

  const openOutfitSheet = () => {
    setOutfitName(t('outfits.defaultName', { n: (outfits?.length ?? 0) + 1 }))
    setOutfitSheet(true)
  }

  const saveLook = async () => {
    const name = outfitName.trim() || t('outfits.defaultName', { n: (outfits?.length ?? 0) + 1 })
    await saveOutfit(name, loggedList)
    setOutfitSheet(false)
    toast(t('outfits.saved'))
  }

  return (
    <Screen eyebrow={formatDate(today, 'weekday')} title={greeting()}>
      <StreakChip days={days} today={today} />

      {isToday && rediscovery && <RediscoveryCard pick={rediscovery} today={today} skipped={skipped} />}

      <DateSwitcher date={date} today={today} onChange={setDate} />
      {!isToday && (
        <button type="button" onClick={() => setDate(today)} className="mt-2 min-h-10 px-1 text-[14px] font-semibold text-mak underline underline-offset-4">
          {t('today.backToToday')}
        </button>
      )}

      <h2 className="mt-6 text-[1.55rem] leading-tight">{isToday ? t('today.question') : t('today.questionPast')}</h2>
      <p className="mt-1 min-h-5 text-[14px] text-muted" aria-live="polite">
        {loggedList.length > 0 && t('today.logged', { count: loggedList.length })}
      </p>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {same.length > 0 && (
          <button
            type="button"
            disabled={sameMissing.length === 0}
            onClick={() => void logGroup(same, t('today.logged', { count: sameMissing.length }))}
            className={`${chip} border-ink bg-ink text-card`}
          >
            <Repeat size={16} aria-hidden="true" />
            {sameMissing.length === 0 ? t('today.alreadyLogged') : isToday ? t('today.sameAsYesterday') : t('today.sameAsDayBefore')}
          </button>
        )}
        {usableOutfits.map((o) => {
          const allLogged = o.itemIds.every((id) => logged.has(id))
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={allLogged}
              onClick={() => void toggleOutfit(o)}
              className={`${chip} ${allLogged ? 'border-koniczyna bg-tint-mieta text-koniczyna-ink' : 'border-ink/12 bg-card text-ink/85 hover:border-ink/30'}`}
            >
              {allLogged && <Check size={16} strokeWidth={3} aria-hidden="true" />}
              {o.name}
            </button>
          )
        })}
        <Link to="/outfits" className={`${chip} border-dashed border-ink/25 text-ink/70 hover:border-ink/45`}>
          {usableOutfits.length > 0 ? t('today.manageOutfits') : (
            <>
              <Plus size={16} aria-hidden="true" />
              {t('today.newOutfit')}
            </>
          )}
        </Link>
      </div>

      {expanded && (
        <div className="relative mt-4">
          <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink/45" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('today.findPiece')}
            aria-label={t('today.findPiece')}
            className="min-h-12 w-full rounded-full border-[1.5px] border-ink/35 bg-card pr-4 pl-11 text-[16px] placeholder:text-ink/60 focus:border-mak focus:outline-none"
          />
        </div>
      )}

      <ul className="mt-4 grid grid-cols-3 gap-x-3 gap-y-4">
        {shown.map((item) => (
          <li key={item.id}>
            <LogTile item={item} selected={logged.has(item.id)} onToggle={() => void toggle(item.id)} />
          </li>
        ))}
      </ul>
      {shown.length === 0 && <p className="py-6 text-center text-muted">{t('today.noneFound')}</p>}

      {grid.total > COLLAPSED && (
        <Button
          variant="ghost"
          block
          className="mt-5"
          onClick={() => {
            setExpanded((e) => !e)
            setQuery('')
          }}
        >
          {expanded ? t('today.showFewer') : t('today.showAll', { count: grid.total })}
        </Button>
      )}

      {loggedList.length >= 2 && !matchesOutfit && (
        <Button variant="quiet" block className="mt-2 text-mak" onClick={openOutfitSheet}>
          {t('today.saveOutfit')}
        </Button>
      )}

      {/* below the grid, so logging always comes first */}
      {isToday && nudge && (
        <div className="mt-8">
          <NudgeCard nudge={nudge} today={today} />
        </div>
      )}

      <Sheet open={outfitSheet} title={t('outfits.sheetTitle')} onClose={() => setOutfitSheet(false)}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            void saveLook()
          }}
        >
          <p className="text-muted">{t('outfits.sheetBody', { count: loggedList.length })}</p>
          <Field label={t('outfits.name')}>
            {(p) => <TextInput {...p} value={outfitName} onChange={(e) => setOutfitName(e.target.value)} placeholder={t('outfits.namePlaceholder')} />}
          </Field>
          <Button type="submit" block>
            {t('outfits.save')}
          </Button>
        </form>
      </Sheet>
    </Screen>
  )
}
