import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { Camera, ImagePlus, Scissors, Undo2, X } from 'lucide-react'
import type { CategoryId, ColourId, Condition, CurrencyCode, Item, ItemStatus, Season } from '../domain/types'
import { deletePhoto, getPhoto, savePhoto, updateItem, useItem, usePhotoUrl, useSettings, type NewPhoto } from '../data'
import { isDateKey, today } from '../domain/dates'
import { CURRENCIES, isCurrencyCode, parsePriceInput } from '../domain/money'
import { t } from '../i18n'
import { ImageError, processImage } from '../platform/images'
import { CutoutError, removeBackground, type CutoutErrorKind, type CutoutProgress } from '../platform/backgroundRemoval'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Field, Select, TextArea, TextInput } from '../ui/fields'
import { CategoryPicker, ColourPicker, SeasonPicker } from '../ui/pickers'
import { nearestFrequency, WEAR_FREQUENCIES, type WearFrequency } from '../domain/buying'
import { frequencyLabel } from './BeforeYouBuyScreen'
import { TopBar, useBack } from '../ui/TopBar'
import { useToast } from '../ui/Toast'
import { colourWash } from '../ui/ItemThumb'

const CONDITIONS: Condition[] = ['new_with_tags', 'new_no_tags', 'very_good', 'good', 'satisfactory']
const STATUSES: ItemStatus[] = ['active', 'occasion', 'sentimental', 'archived', 'listed', 'sold', 'donated']

interface Draft {
  name: string
  category: CategoryId
  colour?: ColourId
  seasons: Season[]
  price: string
  currency: CurrencyCode
  purchaseDate: string
  brand: string
  size: string
  condition: Condition | ''
  status: ItemStatus
  favourite: boolean
  notes: string
  salePrice: string
  saleDate: string
  wearsPerMonth: WearFrequency
  priorWears: string
}

function toDraft(item: Item, defaultCurrency: CurrencyCode): Draft {
  return {
    name: item.name,
    category: item.category,
    colour: item.colour,
    seasons: item.seasons,
    price: item.price ? String(item.price.amount).replace('.', ',') : '',
    currency: item.price?.currency ?? defaultCurrency,
    purchaseDate: item.purchaseDate ?? '',
    brand: item.brand ?? '',
    size: item.size ?? '',
    condition: item.condition ?? '',
    status: item.status,
    favourite: item.favourite,
    notes: item.notes ?? '',
    salePrice: item.sale ? String(item.sale.amount).replace('.', ',') : '',
    saleDate: item.sale?.date ?? '',
    wearsPerMonth: nearestFrequency(item.wishlist?.wearsPerMonth ?? 4),
    priorWears: item.priorWears ? String(item.priorWears) : '',
  }
}

type PhotoChange = { state: 'keep' } | { state: 'new'; data: NewPhoto; url: string } | { state: 'remove' }

/** What the photo was before the background came off, so Undo can bring it back. */
type BeforeCutout = { state: 'keep' } | { state: 'new'; data: NewPhoto }
type Cutout = { state: 'idle' } | { state: 'working'; progress: CutoutProgress } | { state: 'done'; before: BeforeCutout }

const photoUrl = (data: NewPhoto) => URL.createObjectURL(new Blob([data.bytes], { type: data.type }))

export function ItemEditorScreen() {
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
  // keyed so the form starts fresh from the stored item
  return <Editor key={item.id} item={item} defaultCurrency={settings.currency} />
}

function Editor({ item, defaultCurrency }: { item: Item; defaultCurrency: CurrencyCode }) {
  const [draft, setDraft] = useState(() => toDraft(item, defaultCurrency))
  const [initial] = useState(() => JSON.stringify(toDraft(item, defaultCurrency)))
  const [photo, setPhoto] = useState<PhotoChange>({ state: 'keep' })
  const [busy, setBusy] = useState(false)
  const [photoError, setPhotoError] = useState(false)
  const [cutout, setCutout] = useState<Cutout>({ state: 'idle' })
  const [cutoutError, setCutoutError] = useState<CutoutErrorKind>()
  const [errors, setErrors] = useState<{ name?: string; price?: string; salePrice?: string; priorWears?: string }>({})
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [saving, setSaving] = useState(false)
  const cameraInput = useRef<HTMLInputElement>(null)
  const libraryInput = useRef<HTMLInputElement>(null)
  const existingUrl = usePhotoUrl(item.photoId)
  const back = useBack(`/item/${item.id}`)
  const toast = useToast()

  const dirty = JSON.stringify(draft) !== initial || photo.state !== 'keep'
  const shownUrl = photo.state === 'new' ? photo.url : photo.state === 'remove' ? undefined : existingUrl

  useEffect(() => {
    if (photo.state !== 'new') return
    return () => URL.revokeObjectURL(photo.url)
  }, [photo])

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))

  const cutoutBusy = cutout.state === 'working'

  /** A different photo (or none) starts the background removal over. */
  const changePhoto = (next: PhotoChange) => {
    setPhoto(next)
    setCutout({ state: 'idle' })
    setCutoutError(undefined)
  }

  const pick = async (input: HTMLInputElement) => {
    const file = input.files?.[0]
    input.value = '' // allow picking the same file again
    if (!file) return
    setBusy(true)
    setPhotoError(false)
    try {
      const data = await processImage(file)
      changePhoto({ state: 'new', data, url: photoUrl(data) })
    } catch (err) {
      if (!(err instanceof ImageError)) console.error(err)
      setPhotoError(true)
    } finally {
      setBusy(false)
    }
  }

  const cutOut = async () => {
    const source = photo.state === 'new' ? photo.data : item.photoId ? await getPhoto(item.photoId) : undefined
    if (!source) return
    const before: BeforeCutout = photo.state === 'new' ? { state: 'new', data: photo.data } : { state: 'keep' }
    setCutoutError(undefined)
    setCutout({ state: 'working', progress: { stage: 'preparing' } })
    try {
      const data = await removeBackground(source, (progress) => setCutout({ state: 'working', progress }))
      setPhoto({ state: 'new', data, url: photoUrl(data) })
      setCutout({ state: 'done', before })
    } catch (err) {
      if (!(err instanceof CutoutError)) console.error(err)
      setCutoutError(err instanceof CutoutError ? err.kind : 'failed')
      setCutout({ state: 'idle' })
    }
  }

  const undoCutout = () => {
    if (cutout.state !== 'done') return
    const { before } = cutout
    changePhoto(before.state === 'keep' ? before : { state: 'new', data: before.data, url: photoUrl(before.data) })
  }

  const save = async () => {
    const name = draft.name.trim()
    const price = parsePriceInput(draft.price)
    const salePrice = draft.status === 'sold' ? parsePriceInput(draft.salePrice) : undefined
    const priorText = draft.priorWears.trim()
    const priorWears = priorText === '' ? 0 : /^\d{1,5}$/.test(priorText) ? Number(priorText) : null
    const nextErrors = {
      name: name ? undefined : t('editor.nameRequired'),
      price: price === null ? t('editor.priceInvalid') : undefined,
      salePrice: salePrice === null ? t('editor.priceInvalid') : undefined,
      priorWears: priorWears === null ? t('editor.priorWearsInvalid') : undefined,
    }
    setErrors(nextErrors)
    if (nextErrors.name || nextErrors.price || nextErrors.salePrice || nextErrors.priorWears) {
      // bring the first problem into view
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }

    setSaving(true)
    let photoId = item.photoId
    if (photo.state === 'new') {
      photoId = await savePhoto(photo.data)
      if (item.photoId) await deletePhoto(item.photoId)
    } else if (photo.state === 'remove') {
      if (item.photoId) await deletePhoto(item.photoId)
      photoId = undefined
    }
    await updateItem(item.id, {
      name,
      category: draft.category,
      colour: draft.colour,
      seasons: draft.seasons,
      price: price === undefined || price === null ? undefined : { amount: price, currency: draft.currency },
      purchaseDate: draft.purchaseDate || undefined,
      brand: draft.brand.trim() || undefined,
      size: draft.size.trim() || undefined,
      condition: draft.condition || undefined,
      status: draft.status,
      favourite: draft.favourite,
      notes: draft.notes.trim() || undefined,
      sale:
        draft.status === 'sold' && salePrice !== undefined && salePrice !== null
          ? { amount: salePrice, currency: draft.currency, date: isDateKey(draft.saleDate) ? draft.saleDate : today() }
          : undefined,
      photoId,
      placeholder: false,
      priorWears: priorWears ? priorWears : undefined,
      wishlist: item.kind === 'wishlist' ? { ...item.wishlist, wearsPerMonth: draft.wearsPerMonth } : item.wishlist,
    })
    toast(t('editor.saved'))
    back()
  }

  return (
    <>
      <TopBar
        title={item.kind === 'wishlist' ? t('editor.editWishlistTitle') : t('editor.editTitle')}
        onBack={() => (dirty ? setConfirmDiscard(true) : back())}
        backLabel={t('common.cancel')}
        backIcon={<X size={24} aria-hidden="true" />}
      />

      <form
        className="mx-auto flex max-w-lg flex-col gap-7 px-4 pt-2 pb-32"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
        noValidate
      >
        <section aria-labelledby="photo-label">
          <p id="photo-label" className="font-semibold">
            {t('editor.photo')}
            <span className="ml-1.5 text-[13px] font-normal text-muted">({t('common.optional')})</span>
          </p>
          <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void pick(e.currentTarget)} />
          <input ref={libraryInput} type="file" accept="image/*" className="hidden" onChange={(e) => void pick(e.currentTarget)} />
          {shownUrl ? (
            <div className="mt-2 flex items-end gap-4">
              <div className="aspect-[4/5] w-36 overflow-hidden rounded-[22px] shadow-soft" style={{ background: colourWash({ colour: draft.colour }) }}>
                <img src={shownUrl} alt="" className="h-full w-full object-contain" />
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="ghost" className="min-h-11 px-4" icon={<Camera size={17} aria-hidden="true" />} disabled={cutoutBusy} onClick={() => cameraInput.current?.click()}>
                  {t('editor.takePhoto')}
                </Button>
                <Button variant="ghost" className="min-h-11 px-4" icon={<ImagePlus size={17} aria-hidden="true" />} disabled={cutoutBusy} onClick={() => libraryInput.current?.click()}>
                  {t('editor.replacePhoto')}
                </Button>
                <Button variant="quiet" className="min-h-11 px-4 text-muted" disabled={cutoutBusy} onClick={() => changePhoto({ state: 'remove' })}>
                  {t('editor.removePhoto')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-2 rounded-[22px] border-2 border-dashed border-ink/15 bg-card/60 p-4">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="ghost" className="px-3 whitespace-nowrap" icon={<Camera size={18} aria-hidden="true" />} onClick={() => cameraInput.current?.click()}>
                  {t('editor.takePhoto')}
                </Button>
                <Button variant="ghost" className="px-3 whitespace-nowrap" icon={<ImagePlus size={18} aria-hidden="true" />} onClick={() => libraryInput.current?.click()}>
                  {t('editor.choosePhoto')}
                </Button>
              </div>
              <p className="mt-2.5 text-center text-[13.5px] text-muted">{t('editor.photoHint')}</p>
            </div>
          )}
          {shownUrl &&
            (cutout.state === 'done' ? (
              <Button variant="quiet" className="mt-3 min-h-11 px-4" icon={<Undo2 size={17} aria-hidden="true" />} onClick={undoCutout}>
                {t('editor.undoCutout')}
              </Button>
            ) : (
              <Button variant="ghost" className="mt-3 min-h-11 px-4" icon={<Scissors size={17} aria-hidden="true" />} disabled={cutoutBusy || busy} onClick={() => void cutOut()}>
                {t('editor.removeBackground')}
              </Button>
            ))}
          <div aria-live="polite">
            {busy && <p className="mt-2 text-[14px] text-muted">{t('editor.processing')}</p>}
            {photoError && <p className="mt-2 text-[14px] font-semibold text-mak">{t('editor.photoFailed')}</p>}
            {cutout.state === 'working' && (
              <p className="mt-2 text-[14px] text-muted">
                {cutout.progress.stage === 'download'
                  ? t('editor.cutoutDownloading', { percent: Math.round(cutout.progress.fraction * 100) })
                  : cutout.progress.stage === 'preparing'
                    ? t('editor.cutoutPreparing')
                    : t('editor.cutoutWorking')}
              </p>
            )}
            {cutoutError && <p className="mt-2 text-[14px] font-semibold text-mak">{t(`editor.cutoutErrors.${cutoutError}`)}</p>}
          </div>
        </section>

        <Field label={t('editor.name')} error={errors.name}>
          {(p) => <TextInput {...p} value={draft.name} onChange={(e) => update('name', e.target.value)} autoComplete="off" />}
        </Field>

        <CategoryPicker label={t('editor.category')} value={draft.category} onChange={(c) => update('category', c)} />

        <ColourPicker label={t('editor.colour')} value={draft.colour} onChange={(c) => update('colour', c)} />

        <SeasonPicker label={t('editor.seasons')} hint={t('editor.seasonsHint')} value={draft.seasons} onChange={(s) => update('seasons', s)} />

        <div className="grid grid-cols-[1fr_7rem] items-start gap-2">
          <Field label={t('editor.price')} error={errors.price} optional>
            {(p) => (
              <TextInput
                {...p}
                inputMode="decimal"
                value={draft.price}
                onChange={(e) => update('price', e.target.value)}
                placeholder={t('editor.pricePlaceholder')}
                autoComplete="off"
              />
            )}
          </Field>
          <Field label={t('editor.currency')}>
            {(p) => (
              <Select
                {...p}
                value={draft.currency}
                onChange={(e) => isCurrencyCode(e.target.value) && update('currency', e.target.value)}
                className="px-3"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        {item.kind === 'wishlist' ? (
          <Field label={t('wishlist.wearsPerMonth')}>
            {(p) => (
              <Select {...p} value={draft.wearsPerMonth} onChange={(e) => update('wearsPerMonth', nearestFrequency(Number(e.target.value)))}>
                {WEAR_FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {t(frequencyLabel(f))}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        ) : (
          <Field label={t('editor.purchaseDate')} optional>
            {(p) => <TextInput {...p} type="date" max={today()} value={draft.purchaseDate} onChange={(e) => update('purchaseDate', e.target.value)} />}
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('editor.brand')} optional>
            {(p) => <TextInput {...p} value={draft.brand} onChange={(e) => update('brand', e.target.value)} autoComplete="off" />}
          </Field>
          <Field label={t('editor.size')} optional>
            {(p) => (
              <TextInput {...p} value={draft.size} onChange={(e) => update('size', e.target.value)} placeholder={t('editor.sizePlaceholder')} autoComplete="off" />
            )}
          </Field>
        </div>

        {item.kind === 'owned' && (
        <>
        <Field label={t('editor.condition')} optional>
          {(p) => (
            <Select {...p} value={draft.condition} onChange={(e) => update('condition', e.target.value as Condition | '')}>
              <option value="">{t('editor.conditionNone')}</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {t(`conditions.${c}`)}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label={t('editor.status')}>
          {(p) => (
            <Select {...p} value={draft.status} onChange={(e) => update('status', e.target.value as ItemStatus)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`statuses.${s}`)}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {draft.status === 'sold' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label={`${t('editor.salePrice')} (${draft.currency})`} error={errors.salePrice} optional>
              {(p) => <TextInput {...p} inputMode="decimal" value={draft.salePrice} onChange={(e) => update('salePrice', e.target.value)} autoComplete="off" />}
            </Field>
            <Field label={t('editor.saleDate')}>
              {(p) => <TextInput {...p} type="date" max={today()} value={draft.saleDate} onChange={(e) => update('saleDate', e.target.value)} />}
            </Field>
          </div>
        )}
        </>
        )}

        {item.kind === 'owned' && (
          <Field label={t('editor.priorWears')} hint={t('editor.priorWearsHint')} error={errors.priorWears} optional>
            {(p) => (
              <TextInput {...p} inputMode="numeric" value={draft.priorWears} onChange={(e) => update('priorWears', e.target.value)} autoComplete="off" className="max-w-32" />
            )}
          </Field>
        )}

        <label className="flex cursor-pointer items-start gap-3 rounded-[22px] bg-card p-4 shadow-soft">
          <input
            type="checkbox"
            checked={draft.favourite}
            onChange={(e) => update('favourite', e.target.checked)}
            className="mt-0.5 h-6 w-6 shrink-0 accent-mak"
          />
          <span>
            <span className="block font-semibold">{t('editor.favourite')}</span>
            <span className="block text-[13.5px] text-muted">{t('editor.favouriteHint')}</span>
          </span>
        </label>

        <Field label={t('editor.notes')} optional>
          {(p) => <TextArea {...p} value={draft.notes} onChange={(e) => update('notes', e.target.value)} placeholder={t('editor.notesPlaceholder')} rows={3} />}
        </Field>

        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-thread bg-paper/95 pb-safe backdrop-blur-sm">
          <div className="mx-auto max-w-lg px-4 py-3">
            <Button type="submit" block disabled={saving || busy || cutoutBusy}>
              {t('editor.save')}
            </Button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDiscard}
        title={t('editor.discardTitle')}
        confirmLabel={t('editor.discard')}
        onConfirm={() => {
          setConfirmDiscard(false)
          back()
        }}
        onCancel={() => setConfirmDiscard(false)}
      >
        {t('editor.discardBody')}
      </ConfirmDialog>
    </>
  )
}
