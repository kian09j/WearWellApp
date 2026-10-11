import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Copy, ExternalLink } from 'lucide-react'
import type { Item, Settings } from '../domain/types'
import { updateItem, updateSettings, useItem, useItems, useSettings } from '../data'
import { isDateKey } from '../domain/dates'
import { buildListing, type ListingLanguage } from '../domain/listing'
import { parsePriceInput } from '../domain/money'
import { moneyRecovered, suggestResalePrice } from '../domain/resale'
import { vintedSellUrl } from '../domain/vinted'
import { formatDate, formatMoney, t } from '../i18n'
import { copyText } from '../platform/clipboard'
import { openExternal } from '../platform/external'
import { Button } from '../ui/Button'
import { Field, TextArea, TextInput } from '../ui/fields'
import { ItemThumb } from '../ui/ItemThumb'
import { Sheet } from '../ui/Sheet'
import { TopBar, useBack } from '../ui/TopBar'
import { useToast } from '../ui/Toast'
import { useToday } from '../ui/useToday'

export function SellScreen() {
  const { id } = useParams()
  const item = useItem(id)
  const settings = useSettings()
  const back = useBack(`/item/${id}`)
  if (item === undefined || settings === undefined) return null
  if (item === null) {
    return (
      <>
        <TopBar onBack={back} />
        <p className="mx-auto max-w-lg px-4 py-12 text-center text-muted">{t('item.notFound')}</p>
      </>
    )
  }
  return <Seller key={item.id} item={item} settings={settings} />
}

function Seller({ item, settings }: { item: Item; settings: Settings }) {
  const today = useToday()
  const back = useBack(`/item/${item.id}`)
  const toast = useToast()
  const items = useItems()
  const [lang, setLang] = useState<ListingLanguage>(settings.listingLanguage)
  const [selling, setSelling] = useState(false)

  // regenerate only when something that appears in the listing changes, so a status change
  // (listed, sold) never throws away edits to the text
  const listingKey = JSON.stringify({
    name: item.name,
    category: item.category,
    colour: item.colour,
    brand: item.brand,
    size: item.size,
    condition: item.condition,
    purchaseDate: item.purchaseDate,
    price: item.price,
    placeholder: item.placeholder,
  })
  const generated = useMemo(() => buildListing(JSON.parse(listingKey) as Parameters<typeof buildListing>[0], lang), [listingKey, lang])
  const [title, setTitle] = useState(generated.title)
  const [description, setDescription] = useState(generated.description)
  useEffect(() => {
    setTitle(generated.title)
    setDescription(generated.description)
  }, [generated])

  const suggestion = suggestResalePrice(item, today)
  const recovered = items ? moneyRecovered(items).get(item.sale?.currency ?? item.price?.currency ?? settings.currency) : undefined

  const chooseLanguage = (next: ListingLanguage) => {
    setLang(next)
    void updateSettings({ listingLanguage: next })
  }

  const copy = async (text: string, done: string) => toast((await copyText(text)) ? done : t('sell.copyFailed'))

  const before = { status: item.status, sale: item.sale }
  const undo = () => void updateItem(item.id, before)

  const setStatus = async (status: Item['status'], message: string) => {
    await updateItem(item.id, { status, sale: status === 'sold' ? item.sale : undefined })
    toast(message, { label: t('common.undo'), onClick: undo })
  }

  return (
    <>
      <TopBar title={t('sell.title')} onBack={back} />
      <div className="mx-auto flex max-w-lg flex-col gap-5 px-4 pb-12">
        <div className="flex items-center gap-4">
          <div className="h-20 w-16 shrink-0 overflow-hidden rounded-2xl bg-card shadow-soft">
            <ItemThumb item={item} iconSize={28} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[1.5rem] leading-tight">{item.name}</h2>
            <p className="text-[14px] text-muted">{t('sell.statusNow', { status: t(`statuses.${item.status}`) })}</p>
          </div>
        </div>

        {item.status === 'sold' ? (
          <section className="rounded-[24px] bg-tint-mieta p-5">
            <p className="text-[15px] font-semibold">
              {item.sale ? t('sell.soldOn', { amount: formatMoney(item.sale), date: formatDate(item.sale.date) }) : t('sell.soldNoPrice')}
            </p>
            {recovered && <p className="mt-1 text-[14px] text-ink/75">{t('sell.recovered', { amount: formatMoney({ amount: recovered.amount, currency: item.sale?.currency ?? settings.currency }) })}</p>}
            <Button variant="ghost" className="mt-4 min-h-11" onClick={() => void setStatus('active', t('sell.backInRotation', { name: item.name }))}>
              {t('sell.backToWardrobe')}
            </Button>
          </section>
        ) : (
          <section className="rounded-[24px] bg-tint-maslo p-5" aria-labelledby="suggestion">
            <h3 id="suggestion" className="label-caps">
              {t('sell.suggestion')}
            </h3>
            {suggestion ? (
              <>
                <p className="mt-1 font-display text-[2.1rem] leading-tight lining-nums">
                  {t('sell.range', { low: formatMoney(suggestion.low), high: formatMoney(suggestion.high) })}
                </p>
                <p className="mt-2 text-[14px] leading-snug text-ink/75">{t('sell.basedOn', { price: formatMoney(item.price!) })}</p>
                {!suggestion.conditionKnown && <p className="mt-1 text-[13.5px] text-ink/65">{t('sell.assumedCondition')}</p>}
                {!suggestion.ageKnown && <p className="mt-1 text-[13.5px] text-ink/65">{t('sell.assumedAge')}</p>}
              </>
            ) : (
              <p className="mt-1 text-[15px]">{t('sell.noPrice')}</p>
            )}
            {(!suggestion || !item.size || !item.condition) && (
              <p className="mt-3 text-[14px]">
                {!item.size || !item.condition ? `${t('sell.missing')} ` : ''}
                <Link to={`/item/${item.id}/edit`} className="font-semibold text-mak-strong underline underline-offset-4">
                  {t('sell.addDetails')}
                </Link>
              </p>
            )}
          </section>
        )}

        <fieldset>
          <legend className="mb-2 font-semibold">{t('sell.language')}</legend>
          <div className="grid grid-cols-2 gap-1 rounded-full bg-sand p-1">
            {(['pl', 'en'] as const).map((l) => (
              <label key={l} className="cursor-pointer">
                <input type="radio" name="lang" checked={lang === l} onChange={() => chooseLanguage(l)} className="peer sr-only" />
                <span className="flex min-h-10 items-center justify-center rounded-full text-[14px] font-semibold text-ink/70 peer-checked:bg-card peer-checked:text-ink peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-mak">
                  {l === 'pl' ? t('sell.polish') : t('sell.english')}
                </span>
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-[13px] text-muted">{t('sell.languageNote')}</p>
        </fieldset>

        <Field label={t('sell.listingTitle')}>
          {(p) => (
            <div className="flex gap-2">
              <TextInput {...p} value={title} onChange={(e) => setTitle(e.target.value)} />
              <Button variant="ink" className="min-h-12 shrink-0 px-4" icon={<Copy size={16} aria-hidden="true" />} onClick={() => void copy(title, t('sell.copiedTitle'))}>
                {t('sell.copy')}
              </Button>
            </div>
          )}
        </Field>

        <Field label={t('sell.description')}>
          {(p) => <TextArea {...p} rows={9} value={description} onChange={(e) => setDescription(e.target.value)} className="leading-relaxed" />}
        </Field>
        <Button variant="ink" className="-mt-2 min-h-11 self-start" icon={<Copy size={16} aria-hidden="true" />} onClick={() => void copy(description, t('sell.copiedDescription'))}>
          {t('sell.copy')}
        </Button>

        <p className="text-[14px] leading-relaxed text-muted">{t('sell.how')}</p>

        <div className="flex flex-col gap-2">
          <Button icon={<ExternalLink size={18} aria-hidden="true" />} onClick={() => openExternal(vintedSellUrl(settings.vintedCountry))}>
            {t('sell.openVinted')}
          </Button>
          {item.status !== 'listed' && item.status !== 'sold' && (
            <Button variant="ghost" onClick={() => void setStatus('listed', t('sell.listed', { name: item.name }))}>
              {t('sell.markListed')}
            </Button>
          )}
          {item.status === 'listed' && (
            <>
              <Button variant="ghost" onClick={() => setSelling(true)}>
                {t('sell.markSold')}
              </Button>
              <Button variant="quiet" onClick={() => void setStatus('active', t('sell.backInRotation', { name: item.name }))}>
                {t('sell.backToWardrobe')}
              </Button>
            </>
          )}
        </div>
      </div>

      <Sheet open={selling} title={t('sell.soldTitle')} onClose={() => setSelling(false)}>
        {selling && (
          <SaleForm
            item={item}
            defaultAmount={suggestion?.mid.amount}
            currency={item.price?.currency ?? settings.currency}
            today={today}
            onDone={(message) => {
              setSelling(false)
              toast(message, { label: t('common.undo'), onClick: undo })
            }}
          />
        )}
      </Sheet>
    </>
  )
}

function SaleForm({
  item,
  defaultAmount,
  currency,
  today,
  onDone,
}: {
  item: Item
  defaultAmount?: number
  currency: Settings['currency']
  today: string
  onDone: (message: string) => void
}) {
  const [amount, setAmount] = useState(defaultAmount !== undefined ? String(defaultAmount).replace('.', ',') : '')
  const [date, setDate] = useState(today)
  const [error, setError] = useState<string>()

  const save = async () => {
    const value = parsePriceInput(amount)
    if (value === null) {
      setError(t('editor.priceInvalid'))
      return
    }
    const sale = value === undefined ? undefined : { amount: value, currency, date: isDateKey(date) ? date : today }
    await updateItem(item.id, { status: 'sold', sale })
    onDone(sale ? t('sell.sold', { amount: formatMoney(sale) }) : t('sell.soldNoPrice'))
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <Field label={`${t('sell.salePrice')} (${currency})`} hint={t('sell.saleHint')} error={error}>
        {(p) => <TextInput {...p} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoComplete="off" />}
      </Field>
      <Field label={t('sell.saleDate')}>
        {(p) => <TextInput {...p} type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />}
      </Field>
      <Button type="submit" block>
        {t('sell.saveSale')}
      </Button>
    </form>
  )
}
