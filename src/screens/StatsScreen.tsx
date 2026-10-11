import { useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { CategoryId, CurrencyCode } from '../domain/types'
import { updateSettings, useItems, useSettings, useWears } from '../data'
import { CATEGORIES } from '../domain/categories'
import { categoryCpw, targetProgress, wardrobeCpw, type CategoryCpw } from '../domain/cpw'
import { parsePriceInput } from '../domain/money'
import { buildWearIndex } from '../domain/wearStats'
import { formatMoney, t } from '../i18n'
import { Button } from '../ui/Button'
import { CategoryIcon } from '../ui/CategoryIcon'
import { Field, TextInput } from '../ui/fields'
import { ProgressBar } from '../ui/ProgressBar'
import { Screen } from '../ui/Screen'
import { Sheet } from '../ui/Sheet'
import { useToast } from '../ui/Toast'
import { useToday } from '../ui/useToday'
import { moneyRecovered } from '../domain/resale'
import { bestCpw, colourBreakdown, highestCpw, inWardrobe, leastWorn, mostWorn, wardrobeValue, wornShare } from '../domain/stats'
import { Link } from 'react-router'
import { Flower } from '../ui/Flower'
import { ColourBars, moneyList, RankedList, StatSection, StatTile } from './StatsWidgets'

function TargetSheet({
  category,
  group,
  currency,
  current,
  onClose,
}: {
  category: CategoryId
  group?: CategoryCpw
  currency: CurrencyCode
  current?: number
  onClose: () => void
}) {
  const [text, setText] = useState(current ? String(current).replace('.', ',') : '')
  const [error, setError] = useState<string>()
  const toast = useToast()
  const settings = useSettings()

  const save = async () => {
    const value = parsePriceInput(text)
    if (value === null || value === undefined || value <= 0) {
      setError(t('cpw.targetInvalid'))
      return
    }
    await updateSettings({ targetCpw: { ...settings?.targetCpw, [category]: value } })
    toast(t('cpw.targetSaved'))
    onClose()
  }

  const remove = async () => {
    const next = { ...settings?.targetCpw }
    delete next[category]
    await updateSettings({ targetCpw: next })
    toast(t('cpw.targetRemoved'))
    onClose()
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      {group?.cpw !== undefined && <p className="text-muted">{t('cpw.targetNow', { amount: formatMoney({ amount: group.cpw, currency }) })}</p>}
      <Field label={t('cpw.targetLabel', { currency })} hint={t('cpw.targetHint')} error={error}>
        {(p) => <TextInput {...p} inputMode="decimal" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />}
      </Field>
      <Button type="submit" block>
        {t('cpw.targetSave')}
      </Button>
      {current !== undefined && (
        <Button variant="quiet" block onClick={remove}>
          {t('cpw.targetRemove')}
        </Button>
      )}
    </form>
  )
}

export function StatsScreen() {
  const items = useItems()
  const wears = useWears()
  const settings = useSettings()
  const [editing, setEditing] = useState<CategoryId>()

  const currency = settings?.currency ?? 'PLN'
  const wearIndex = useMemo(() => buildWearIndex(wears ?? [], items ?? []), [wears, items])
  const groups = useMemo(() => wardrobeCpw(items ?? [], wearIndex), [items, wearIndex])
  const categories = useMemo(() => categoryCpw(items ?? [], wearIndex, currency), [items, wearIndex, currency])
  const main = groups.get(currency)
  const others = [...groups.values()].filter((g) => g.currency !== currency)
  const targets = settings?.targetCpw ?? {}
  const today = useToday()
  const value = useMemo(() => wardrobeValue(items ?? []), [items])
  const share = useMemo(() => wornShare(items ?? [], wearIndex, today), [items, wearIndex, today])
  const recovered = useMemo(() => [...moneyRecovered(items ?? []).entries()].map(([cur, r]) => ({ amount: r.amount, currency: cur })), [items])
  const soldCount = useMemo(() => [...moneyRecovered(items ?? []).values()].reduce((n, r) => n + r.sold, 0), [items])
  const donated = (items ?? []).filter((i) => i.kind === 'owned' && i.status === 'donated').length
  const most = useMemo(() => mostWorn(items ?? [], wearIndex), [items, wearIndex])
  const least = useMemo(() => leastWorn(items ?? [], wearIndex, today), [items, wearIndex, today])
  const best = useMemo(() => bestCpw(items ?? [], wearIndex, currency), [items, wearIndex, currency])
  const highest = useMemo(() => highestCpw(items ?? [], wearIndex, currency), [items, wearIndex, currency])
  const colours = useMemo(() => colourBreakdown(items ?? []), [items])

  if (items === undefined || wears === undefined || settings === undefined) return <Screen title={t('stats.title')}>{null}</Screen>

  const money = (amount: number) => formatMoney({ amount, currency })

  if (!items.some(inWardrobe)) {
    return (
      <Screen title={t('stats.title')}>
        <section className="card-soft flex flex-col items-center px-6 py-10 text-center">
          <Flower size={64} petal="var(--color-chaber)" inner="var(--color-card)" />
          <p className="mt-5 max-w-xs text-muted">{t('stats.empty')}</p>
          <Link
            to="/welcome/count"
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-mak px-6 text-[15px] font-semibold text-card hover:bg-mak-strong"
          >
            {t('wardrobe.quickCount')}
          </Link>
        </section>
      </Screen>
    )
  }

  return (
    <Screen title={t('stats.title')}>
      <section className="rounded-[28px] bg-tint-mieta p-6" aria-labelledby="avg-title">
        <h2 id="avg-title" className="label-caps">
          {t('cpw.average')}
        </h2>
        {main?.cpw !== undefined ? (
          <>
            <p className="mt-2 font-display text-[3rem] leading-none lining-nums tabular-nums">{money(main.cpw)}</p>
            <p className="mt-3 text-[14.5px] text-ink/80">
              {t('cpw.averageSummary', {
                spent: money(main.spent),
                pieces: t('common.pieces', { count: main.priced }),
                wears: main.wears,
              })}
            </p>
          </>
        ) : (
          <p className="mt-2 text-[15px] text-ink/80">{main ? t('cpw.averageNoWears') : t('cpw.averageNoPrices')}</p>
        )}
        {others.length > 0 && (
          <div className="mt-4 border-t border-ink/10 pt-3 text-[13.5px] text-ink/75">
            <p>{t('cpw.otherCurrencies')}</p>
            <ul className="mt-1">
              {others.map((g) => (
                <li key={g.currency}>
                  {g.cpw !== undefined
                    ? t('cpw.otherGroup', {
                        cpw: formatMoney({ amount: g.cpw, currency: g.currency }),
                        pieces: t('common.pieces', { count: g.priced }),
                        currency: g.currency,
                      })
                    : t('cpw.otherGroupNoWears', { pieces: t('common.pieces', { count: g.priced }), currency: g.currency })}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatTile
          label={t('stats.value')}
          value={value.length ? moneyList(value) : '-'}
          meta={value.length ? t('stats.valueMeta', { count: value.reduce((n, v) => n + v.priced, 0) }) : t('stats.valueNone')}
        />
        <StatTile label={t('stats.worn90')} value={`${Math.round(share.ratio * 100)}%`} meta={t('stats.worn90Meta', { worn: share.worn, total: share.total })}>
          <ProgressBar ratio={share.ratio} label={t('stats.worn90')} className="mt-2" />
        </StatTile>
        <div className="col-span-2">
          <StatTile
            label={t('stats.recovered')}
            value={recovered.length ? moneyList(recovered) : '-'}
            meta={
              <>
                {recovered.length ? t('stats.recoveredMeta', { count: soldCount }) : t('stats.recoveredNone')}
                {donated > 0 && ` · ${t('stats.donated', { count: donated })}`}
              </>
            }
          />
        </div>
      </div>

      <StatSection title={t('stats.mostWorn')}>
        {most.length ? (
          <RankedList rows={most} value={(r) => t('stats.times', { count: r.wears })} />
        ) : (
          <p className="card-soft px-5 py-5 text-[14.5px] text-muted">{t('stats.mostWornEmpty')}</p>
        )}
      </StatSection>

      {least.length > 0 && (
        <StatSection title={t('stats.leastWorn')} hint={t('stats.leastWornHint')}>
          <RankedList rows={least} value={(r) => (r.wears ? t('stats.times', { count: r.wears }) : t('common.notWornYet'))} />
        </StatSection>
      )}

      {best.length > 0 && (
        <StatSection title={t('stats.bestCpw')} hint={t('stats.bestCpwHint')}>
          <RankedList rows={best} value={(r) => t('cpw.short', { amount: money(r.cpw!) })} />
        </StatSection>
      )}

      {highest.length > 0 && (
        <StatSection title={t('stats.highestCpw')} hint={t('stats.highestCpwHint')}>
          <RankedList rows={highest} value={(r) => t('cpw.short', { amount: money(r.cpw!) })} />
        </StatSection>
      )}

      <h2 className="label-caps mt-8 mb-2.5 px-1">{t('cpw.byCategory')}</h2>
      <ul className="card-soft divide-y divide-thread overflow-hidden">
        {CATEGORIES.filter((c) => categories.has(c.id)).map(({ id }) => {
          const g = categories.get(id)!
          const target = targets[id]
          const progress = target !== undefined && g.priced > 0 ? targetProgress(g.spent, g.wears, target) : undefined
          const progressText = progress
            ? progress.reached
              ? t('cpw.categoryReached')
              : t('cpw.categoryToTarget', { count: progress.wearsNeeded })
            : undefined
          return (
            <li key={id}>
              <button type="button" onClick={() => setEditing(id)} className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-sand/50">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand text-ink/70">
                  <CategoryIcon category={id} size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-semibold">{t(`categories.${id}`)}</span>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {g.cpw !== undefined ? money(g.cpw) : <span className="font-normal text-muted">{g.priced ? t('cpw.notWorn') : t('cpw.categoryNoPrices')}</span>}
                    </span>
                  </span>
                  <span className="block text-[13px] text-muted">
                    {t('cpw.categoryMeta', { pieces: t('common.pieces', { count: g.pieces }), wears: t('common.wears', { count: g.totalWears }) })}
                  </span>
                  {progress && target !== undefined ? (
                    <span className="mt-2 block">
                      <ProgressBar ratio={progress.ratio} label={`${t('cpw.target', { amount: money(target) })}: ${progressText}`} />
                      <span className={`mt-1 flex justify-between text-[12.5px] ${progress.reached ? 'font-semibold text-koniczyna-ink' : 'text-ink/70'}`}>
                        <span>{t('cpw.target', { amount: money(target) })}</span>
                        <span>{progressText}</span>
                      </span>
                    </span>
                  ) : (
                    <span className="mt-1 block text-[13px] font-semibold text-mak">{target !== undefined ? t('cpw.target', { amount: money(target) }) : t('cpw.setTarget')}</span>
                  )}
                </span>
                <ChevronRight size={18} className="mt-2.5 shrink-0 text-ink/30" aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ul>
      <p className="mt-3 px-1 text-[13px] leading-relaxed text-muted">{t('cpw.how')}</p>

      {colours.length > 0 && (
        <StatSection title={t('stats.colours')} hint={t('stats.coloursHint')}>
          <ColourBars shares={colours} />
        </StatSection>
      )}

      <Sheet open={!!editing} title={editing ? t('cpw.editTarget', { category: t(`categories.${editing}`) }) : ''} onClose={() => setEditing(undefined)}>
        {editing && (
          <TargetSheet
            key={editing}
            category={editing}
            group={categories.get(editing)}
            currency={currency}
            current={targets[editing]}
            onClose={() => setEditing(undefined)}
          />
        )}
      </Sheet>
    </Screen>
  )
}
