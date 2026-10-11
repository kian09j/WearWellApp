import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ChevronRight, Heart } from 'lucide-react'
import type { CategoryId, ColourId, CurrencyCode, Item } from '../domain/types'
import { addItem, useItems, useSettings, useWears } from '../data'
import { coolingOffState, coolingOffUntil, PROJECTION_MONTHS, projectedCpw, similarOwned, WEAR_FREQUENCIES, type WearFrequency } from '../domain/buying'
import { categoryDef } from '../domain/categories'
import { categoryCpw, itemCpw } from '../domain/cpw'
import { CURRENCIES, isCurrencyCode, parsePriceInput } from '../domain/money'
import { buildWearIndex, wearStat } from '../domain/wearStats'
import { formatMoney, t, type TKey } from '../i18n'
import { Button } from '../ui/Button'
import { CategoryChips } from '../ui/CategoryChips'
import { Field, Select, TextInput } from '../ui/fields'
import { ItemThumb } from '../ui/ItemThumb'
import { ColourPicker } from '../ui/pickers'
import { Screen } from '../ui/Screen'
import { useToast } from '../ui/Toast'
import { useToday } from '../ui/useToday'

export const frequencyLabel = (f: WearFrequency): TKey => `beforeYouBuy.freq${f}`

export function SimilarStrip({ items, wears }: { items: Item[]; wears: ReturnType<typeof buildWearIndex> }) {
  return (
    <ul className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
      {items.map((item) => {
        const n = wearStat(wears, item.id).count
        const cpw = itemCpw(item, n)
        return (
          <li key={item.id} className="w-28 shrink-0">
            <Link to={`/item/${item.id}`} className="block">
              <span className="block aspect-[4/5] overflow-hidden rounded-2xl bg-card shadow-soft">
                <ItemThumb item={item} iconSize={30} />
              </span>
              <span className="mt-1.5 block truncate text-[13px] font-semibold">{item.name}</span>
              <span className="block truncate text-[12px] text-muted">
                {cpw.kind === 'cpw' ? t('cpw.short', { amount: formatMoney(cpw.value) }) : n > 0 ? t('wardrobe.tileWears', { count: n }) : t('common.notWornYet')}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export function BeforeYouBuyScreen() {
  const items = useItems()
  const wears = useWears()
  const settings = useSettings()
  const today = useToday()
  const toast = useToast()

  const [priceText, setPriceText] = useState('')
  const [currency, setCurrency] = useState<CurrencyCode>()
  const [category, setCategory] = useState<CategoryId>()
  const [colour, setColour] = useState<ColourId>()
  const [frequency, setFrequency] = useState<WearFrequency>()
  const [name, setName] = useState('')

  const cur = currency ?? settings?.currency ?? 'PLN'
  const price = parsePriceInput(priceText)
  const wearIndex = useMemo(() => buildWearIndex(wears ?? []), [wears])
  const similar = useMemo(() => (category ? similarOwned(items ?? [], category, colour, wearIndex) : []), [items, category, colour, wearIndex])
  const catAverage = useMemo(
    () => (category ? categoryCpw(items ?? [], wearIndex, cur).get(category)?.cpw : undefined),
    [items, wearIndex, cur, category],
  )
  const wishlist = useMemo(
    () => (items ?? []).filter((i) => i.kind === 'wishlist').sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [items],
  )

  if (items === undefined || settings === undefined) return <Screen title={t('beforeYouBuy.title')}>{null}</Screen>

  const ready = typeof price === 'number' && price > 0 && !!category && !!frequency
  const target = category && cur === settings.currency ? settings.targetCpw[category] : undefined
  const yearCpw = ready ? projectedCpw(price, frequency, 12) : undefined
  const suggestedName = category
    ? colour
      ? t('beforeYouBuy.defaultName', { colour: t(`colours.${colour}`), item: t(`categorySingular.${category}`).toLocaleLowerCase() })
      : t(`categorySingular.${category}`)
    : ''

  const save = async () => {
    if (!ready) return
    await addItem({
      kind: 'wishlist',
      name: name.trim() || suggestedName,
      category,
      colour,
      seasons: [...categoryDef(category).defaultSeasons],
      price: { amount: price, currency: cur },
      wishlist: { wearsPerMonth: frequency, coolingOffUntil: settings.coolingOff ? coolingOffUntil(today) : undefined },
    })
    toast(t('beforeYouBuy.saved'))
    setPriceText('')
    setCategory(undefined)
    setColour(undefined)
    setFrequency(undefined)
    setName('')
  }

  return (
    <Screen title={t('beforeYouBuy.title')}>
      <p className="-mt-2 mb-5 text-muted">{t('beforeYouBuy.intro')}</p>

      <section className="card-soft flex flex-col gap-6 p-5">
        <div className="grid grid-cols-[1fr_6.5rem] items-start gap-2">
          <Field label={t('beforeYouBuy.price')}>
            {(p) => <TextInput {...p} inputMode="decimal" value={priceText} onChange={(e) => setPriceText(e.target.value)} autoComplete="off" />}
          </Field>
          <Field label={t('beforeYouBuy.currency')}>
            {(p) => (
              <Select {...p} value={cur} onChange={(e) => isCurrencyCode(e.target.value) && setCurrency(e.target.value)} className="px-3">
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        {price === null && <p className="-mt-4 text-[13.5px] font-semibold text-mak">{t('editor.priceInvalid')}</p>}

        <CategoryChips label={t('beforeYouBuy.category')} value={category} onChange={setCategory} />
        <ColourPicker label={t('beforeYouBuy.colour')} value={colour} onChange={setColour} />

        <fieldset>
          <legend className="font-semibold">{t('beforeYouBuy.frequency')}</legend>
          <p className="mb-2 text-[13.5px] text-muted">{t('beforeYouBuy.frequencyHint')}</p>
          <div className="flex flex-wrap gap-2">
            {WEAR_FREQUENCIES.map((f) => (
              <label key={f} className="cursor-pointer">
                <input type="radio" name="freq" checked={frequency === f} onChange={() => setFrequency(f)} className="peer sr-only" />
                <span className="flex min-h-11 items-center rounded-full border-[1.5px] border-ink/12 bg-card px-4 text-[14px] font-semibold text-ink/80 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-card peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-mak">
                  {t(frequencyLabel(f))}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <div aria-live="polite">
        {!ready ? (
          <p className="mt-5 px-1 text-[14px] text-muted">{t('beforeYouBuy.fillIn')}</p>
        ) : (
          <section className="mt-5 rounded-[28px] bg-tint-mieta p-5" aria-labelledby="projection-title">
            <h2 id="projection-title" className="label-caps">
              {t('beforeYouBuy.resultTitle')}
            </h2>
            <dl className="mt-3 grid grid-cols-3 gap-2">
              {PROJECTION_MONTHS.map((m) => (
                <div key={m} className="rounded-2xl bg-card/70 px-2 py-3 text-center">
                  <dt className="text-[12px] font-semibold text-muted">{t(m === 3 ? 'beforeYouBuy.after3' : m === 6 ? 'beforeYouBuy.after6' : 'beforeYouBuy.after12')}</dt>
                  <dd className="mt-1 font-display text-[1.35rem] leading-tight lining-nums tabular-nums">
                    {formatMoney({ amount: projectedCpw(price, frequency, m), currency: cur })}
                  </dd>
                </div>
              ))}
            </dl>
            {catAverage !== undefined && (
              <p className="mt-3 text-[14px] text-ink/80">
                {t('beforeYouBuy.categoryAverage', { category: t(`categories.${category}`).toLocaleLowerCase(), amount: formatMoney({ amount: catAverage, currency: cur }) })}
              </p>
            )}
            {target !== undefined && yearCpw !== undefined && (
              <p className="mt-1 text-[14px] font-semibold text-koniczyna-ink">
                {yearCpw <= target
                  ? t('beforeYouBuy.targetMet', { amount: formatMoney({ amount: target, currency: cur }) })
                  : t('beforeYouBuy.targetMissed', { amount: formatMoney({ amount: target, currency: cur }) })}
              </p>
            )}

            <h3 className="label-caps mt-5 mb-1">{t('beforeYouBuy.similarTitle')}</h3>
            <p className="mb-3 text-[14px] text-ink/80">
              {similar.length > 0 ? t('beforeYouBuy.similarCount', { count: similar.length }) : t('beforeYouBuy.similarNone')}
            </p>
            {similar.length > 0 && <SimilarStrip items={similar} wears={wearIndex} />}

            <form
              className="mt-5 flex flex-col gap-3 border-t border-ink/10 pt-4"
              onSubmit={(e) => {
                e.preventDefault()
                void save()
              }}
            >
              <Field label={t('beforeYouBuy.wishlistName')} optional>
                {(p) => <TextInput {...p} value={name} onChange={(e) => setName(e.target.value)} placeholder={suggestedName} autoComplete="off" />}
              </Field>
              <Button type="submit" block icon={<Heart size={17} aria-hidden="true" />}>
                {t('beforeYouBuy.saveWishlist')}
              </Button>
            </form>
          </section>
        )}
      </div>

      <h2 className="label-caps mt-8 mb-2.5 px-1">{t('beforeYouBuy.wishlistTitle')}</h2>
      {wishlist.length === 0 ? (
        <p className="card-soft px-5 py-6 text-[14.5px] text-muted">{t('beforeYouBuy.wishlistEmpty')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {wishlist.map((item) => {
            const cooling = coolingOffState(item, today)
            const year = item.price && item.wishlist ? projectedCpw(item.price.amount, item.wishlist.wearsPerMonth, 12) : undefined
            return (
              <li key={item.id}>
                <Link to={`/item/${item.id}`} className="card-soft flex items-center gap-4 p-3 pr-4 hover:shadow-lift">
                  <span className="h-16 w-14 shrink-0 overflow-hidden rounded-2xl bg-card">
                    <ItemThumb item={item} iconSize={26} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{item.name}</span>
                    <span className="block truncate text-[13px] text-muted">
                      {item.price && formatMoney(item.price)}
                      {year !== undefined && item.price && ` · ${t('beforeYouBuy.wishlistYear', { amount: formatMoney({ amount: year, currency: item.price.currency }) })}`}
                    </span>
                    <span
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[12px] font-semibold ${cooling.active ? 'bg-tint-bez text-ink/80' : 'bg-tint-mieta text-koniczyna-ink'}`}
                    >
                      {cooling.active ? t('beforeYouBuy.coolingDays', { count: cooling.daysLeft }) : t('beforeYouBuy.coolingOver')}
                    </span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-ink/30" aria-hidden="true" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Screen>
  )
}
