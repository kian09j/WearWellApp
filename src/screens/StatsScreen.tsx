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
import { Flower } from '../ui/Flower'
import { ProgressBar } from '../ui/ProgressBar'
import { Screen } from '../ui/Screen'
import { Sheet } from '../ui/Sheet'
import { useToast } from '../ui/Toast'

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
  const wearIndex = useMemo(() => buildWearIndex(wears ?? []), [wears])
  const groups = useMemo(() => wardrobeCpw(items ?? [], wearIndex), [items, wearIndex])
  const categories = useMemo(() => categoryCpw(items ?? [], wearIndex, currency), [items, wearIndex, currency])
  const main = groups.get(currency)
  const others = [...groups.values()].filter((g) => g.currency !== currency)
  const targets = settings?.targetCpw ?? {}

  if (items === undefined || wears === undefined || settings === undefined) return <Screen title={t('stats.title')}>{null}</Screen>

  const money = (amount: number) => formatMoney({ amount, currency })

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
                      <span className={`mt-1 flex justify-between text-[12.5px] ${progress.reached ? 'font-semibold text-koniczyna' : 'text-ink/70'}`}>
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

      <section className="mt-8 rounded-[28px] bg-tint-niebo p-6">
        <Flower size={40} petal="var(--color-chaber)" inner="var(--color-card)" />
        <p className="mt-3 text-ink/80">{t('stats.teaser')}</p>
      </section>

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
