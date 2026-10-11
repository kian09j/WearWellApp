import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Camera, ImagePlus, Lightbulb, Plus, ScanSearch, X } from 'lucide-react'
import type { CategoryId, ColourId } from '../domain/types'
import { addItems, undoImport, updateSettings, useSettings, type NewItem } from '../data'
import { CATEGORIES } from '../domain/categories'
import { COLOURS } from '../domain/colours'
import { newId, nowIso } from '../domain/ids'
import { SCAN_MAX_PX, scanItemName, type Confidence } from '../domain/scan'
import { t, type TKey } from '../i18n'
import { openExternal } from '../platform/external'
import { ImageError, processImage } from '../platform/images'
import { ScanError, scanPhoto, type ScanErrorKind } from '../platform/scanApi'
import { Button } from '../ui/Button'
import { CategoryIcon } from '../ui/CategoryIcon'
import { Flower } from '../ui/Flower'
import { Sheet } from '../ui/Sheet'
import { TopBar, useBack } from '../ui/TopBar'
import { useToast } from '../ui/Toast'

type Source = 'camera' | 'library'

interface Row {
  key: string
  name: string
  category: CategoryId
  colour: ColourId | undefined
  confidence: Confidence | 'added'
}

const WORKING: TKey[] = ['scan.working1', 'scan.working2', 'scan.working3', 'scan.working4']

const ERROR_TEXT: Record<ScanErrorKind | 'photo', TKey> = {
  offline: 'scan.errorOffline',
  notConfigured: 'scan.errorNotConfigured',
  limit: 'scan.errorLimit',
  busy: 'scan.errorBusy',
  tooLarge: 'scan.errorTooLarge',
  unreadable: 'scan.errorUnreadable',
  failed: 'scan.errorFailed',
  photo: 'scan.errorPhoto',
}

const select =
  'min-h-11 w-full min-w-0 rounded-xl border-[1.5px] border-ink/35 bg-card px-2.5 text-[14.5px] focus:border-mak focus:outline-none'

/** Photo of a wardrobe section -> Claude lists the pieces -> the person checks them -> added. */
export function ScanScreen() {
  const settings = useSettings()
  const back = useBack('/wardrobe')
  const navigate = useNavigate()
  const toast = useToast()
  const camera = useRef<HTMLInputElement>(null)
  const library = useRef<HTMLInputElement>(null)

  const [phase, setPhase] = useState<'intro' | 'working' | 'review'>('intro')
  const [consentFor, setConsentFor] = useState<Source>()
  const [photoUrl, setPhotoUrl] = useState<string>()
  const [error, setError] = useState<{ kind: ScanErrorKind | 'photo'; limit?: number }>()
  const [rows, setRows] = useState<Row[]>([])
  const [notes, setNotes] = useState('')
  const [remaining, setRemaining] = useState<number>()
  const [tick, setTick] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => () => (photoUrl ? URL.revokeObjectURL(photoUrl) : undefined), [photoUrl])
  useEffect(() => {
    if (phase !== 'working') return
    const id = setInterval(() => setTick((n) => n + 1), 1800)
    return () => clearInterval(id)
  }, [phase])

  const open = (source: Source) => (source === 'camera' ? camera.current : library.current)?.click()

  // The photo goes to a third-party AI, so ask once, first. Opening the picker stays inside the
  // tap on "Agree", which phones require for camera access.
  const start = (source: Source) => {
    if (!settings?.aiConsentAt) setConsentFor(source)
    else open(source)
  }
  const agree = () => {
    const source = consentFor
    setConsentFor(undefined)
    void updateSettings({ aiConsentAt: nowIso() })
    if (source) open(source)
  }

  const run = async (input: HTMLInputElement) => {
    const file = input.files?.[0]
    input.value = ''
    if (!file || !settings) return
    setError(undefined)
    setPhase('working')
    setTick(0)
    try {
      const photo = await processImage(file, SCAN_MAX_PX)
      setPhotoUrl(URL.createObjectURL(new Blob([photo.bytes], { type: photo.type })))
      let deviceId = settings.deviceId
      if (!deviceId) {
        deviceId = newId()
        await updateSettings({ deviceId })
      }
      const result = await scanPhoto(photo, deviceId)
      setRows(
        result.items.map((item) => ({
          key: newId(),
          name: scanItemName(item, (c) => t(`categorySingular.${c}`)),
          category: item.category,
          colour: item.colour ?? undefined,
          confidence: item.confidence,
        })),
      )
      setNotes(result.notes)
      setRemaining(result.remaining)
      setPhase('review')
    } catch (err) {
      if (err instanceof ScanError) setError({ kind: err.kind, limit: err.limit })
      else if (err instanceof ImageError) setError({ kind: 'photo' })
      else {
        console.error(err)
        setError({ kind: 'failed' })
      }
      setPhase('intro')
    }
  }

  const update = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const remove = (key: string) => setRows((rs) => rs.filter((r) => r.key !== key))
  const addMissing = () =>
    setRows((rs) => [...rs, { key: newId(), name: '', category: rs.at(-1)?.category ?? 'tshirts', colour: undefined, confidence: 'added' }])

  const save = async () => {
    if (!rows.length) return
    setSaving(true)
    const items: NewItem[] = rows.map((r) => ({
      name: r.name.trim() || t(`categorySingular.${r.category}`),
      category: r.category,
      colour: r.colour,
      placeholder: true, // still worth adding a price and photo
    }))
    const ids = await addItems(items)
    await updateSettings({ onboarded: true })
    navigate('/wardrobe', { replace: true })
    toast(t('scan.added', { count: ids.length }), { label: t('common.undo'), onClick: () => void undoImport(ids) })
  }

  const reset = () => {
    setRows([])
    setNotes('')
    setPhotoUrl(undefined)
    setPhase('intro')
  }

  return (
    <>
      <TopBar title={t('scan.title')} onBack={back} />
      <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void run(e.currentTarget)} />
      <input ref={library} type="file" accept="image/*" className="hidden" onChange={(e) => void run(e.currentTarget)} />

      <div className="mx-auto flex max-w-lg flex-col gap-5 px-4 pb-32">
        {phase === 'intro' && (
          <>
            {error && (
              <p className="rounded-[20px] bg-tint-maslo px-4 py-3 text-[14.5px]" role="alert">
                {error.kind === 'limit' && !error.limit ? t('scan.errorLimitNoNumber') : t(ERROR_TEXT[error.kind], { limit: error.limit ?? '' })}
              </p>
            )}
            <section className="card-soft p-5">
              <p className="text-[15px] leading-relaxed text-ink/85">{t('scan.intro')}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button className="px-3 whitespace-nowrap" icon={<Camera size={18} aria-hidden="true" />} onClick={() => start('camera')}>
                  {t('scan.takePhoto')}
                </Button>
                <Button variant="ghost" className="px-3 whitespace-nowrap" icon={<ImagePlus size={18} aria-hidden="true" />} onClick={() => start('library')}>
                  {t('scan.choosePhoto')}
                </Button>
              </div>
            </section>

            <section className="rounded-[24px] bg-tint-niebo p-5" aria-labelledby="tips-title">
              <h2 id="tips-title" className="label-caps flex items-center gap-1.5">
                <Lightbulb size={14} aria-hidden="true" />
                {t('scan.tipsTitle')}
              </h2>
              <ul className="mt-2 flex flex-col gap-1.5 text-[14.5px]">
                {(['scan.tip1', 'scan.tip2', 'scan.tip3'] as const).map((k) => (
                  <li key={k} className="flex gap-2">
                    <Flower size={16} petal="var(--color-chaber)" inner="var(--color-card)" className="mt-1 shrink-0" />
                    {t(k)}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[14px] font-semibold">{t('scan.stacks')}</p>
            </section>

            <p className="px-1 text-[13.5px] leading-relaxed text-muted">
              {t('scan.privacy')} {t('scan.dailyLimit')}
            </p>
          </>
        )}

        {phase === 'working' && (
          <section className="flex flex-col items-center py-6 text-center" aria-live="polite" aria-busy="true">
            <div className="relative aspect-[4/5] w-56 overflow-hidden rounded-[28px] bg-sand shadow-soft">
              {photoUrl ? <img src={photoUrl} alt="" className="h-full w-full object-cover" /> : <ScanSearch size={48} className="m-auto mt-24 text-ink/30" aria-hidden="true" />}
              <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-transparent via-card/40 to-transparent" aria-hidden="true" />
            </div>
            <p className="mt-6 font-display text-[1.4rem]">{t(WORKING[tick % WORKING.length]!)}</p>
            <span className="sr-only">{t('scan.working')}</span>
          </section>
        )}

        {phase === 'review' && (
          <>
            <div className="flex items-center gap-4">
              {photoUrl && <img src={photoUrl} alt="" className="h-20 w-16 shrink-0 rounded-2xl object-cover shadow-soft" />}
              <div>
                <h2 className="text-[1.5rem] leading-tight">{rows.length ? t('scan.found', { count: rows.length }) : t('scan.noneFound')}</h2>
                {remaining !== undefined && <p className="text-[13.5px] text-muted">{t('scan.remaining', { count: remaining })}</p>}
              </div>
            </div>
            {notes && <p className="rounded-[20px] bg-tint-bez px-4 py-3 text-[14.5px]">{notes}</p>}
            <p className="text-[14px] text-muted">
              {t('scan.reviewHint')} {t('scan.stacks')}
            </p>

            <ul className="flex flex-col gap-2.5">
              {rows.map((row) => (
                <li key={row.key} className={`rounded-[22px] p-3.5 shadow-soft ${row.confidence === 'low' ? 'bg-tint-maslo ring-2 ring-slonecznik' : 'bg-card'}`}>
                  <div className="flex items-center gap-2">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand text-ink/70" aria-hidden="true">
                      <CategoryIcon category={row.category} size={22} />
                    </span>
                    <label className="min-w-0 flex-1">
                      <span className="sr-only">{t('scan.name')}</span>
                      <input
                        value={row.name}
                        onChange={(e) => update(row.key, { name: e.target.value })}
                        placeholder={t(`categorySingular.${row.category}`)}
                        className="min-h-11 w-full rounded-xl border-[1.5px] border-ink/35 bg-card px-3 text-[15.5px] font-semibold placeholder:font-normal placeholder:text-ink/60 focus:border-mak focus:outline-none"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => remove(row.key)}
                      aria-label={t('scan.remove', { name: row.name || t(`categorySingular.${row.category}`) })}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink/60 hover:bg-sand hover:text-ink"
                    >
                      <X size={18} aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 pl-12">
                    <label>
                      <span className="sr-only">{t('scan.category')}</span>
                      <select value={row.category} onChange={(e) => update(row.key, { category: e.target.value as CategoryId })} className={select}>
                        {CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {t(`categories.${c.id}`)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="sr-only">{t('scan.colour')}</span>
                      <select
                        value={row.colour ?? ''}
                        onChange={(e) => update(row.key, { colour: (e.target.value || undefined) as ColourId | undefined })}
                        className={select}
                      >
                        <option value="">{t('colours.none')}</option>
                        {COLOURS.map((c) => (
                          <option key={c.id} value={c.id}>
                            {t(`colours.${c.id}`)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {(row.confidence === 'low' || row.confidence === 'medium') && (
                    <p className={`mt-2 pl-12 text-[13px] ${row.confidence === 'low' ? 'font-semibold text-ink' : 'text-muted'}`}>
                      {row.confidence === 'low' ? t('scan.checkLow') : t('scan.checkMedium')}
                    </p>
                  )}
                </li>
              ))}
            </ul>

            <Button variant="ghost" icon={<Plus size={18} aria-hidden="true" />} onClick={addMissing}>
              {t('scan.addMissing')}
            </Button>
            <Button variant="quiet" onClick={reset}>
              {t('scan.startOver')}
            </Button>
          </>
        )}
      </div>

      {phase === 'review' && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-thread bg-paper/95 pb-safe backdrop-blur-sm">
          <div className="mx-auto max-w-lg px-4 py-3">
            <Button block disabled={!rows.length || saving} onClick={() => void save()}>
              {rows.length ? t('scan.add', { count: rows.length }) : t('scan.addNone')}
            </Button>
          </div>
        </div>
      )}

      <Sheet open={!!consentFor} title={t('scan.consentTitle')} onClose={() => setConsentFor(undefined)}>
        <div className="flex flex-col gap-3 text-[15px] leading-relaxed">
          <p>{t('scan.consentBody1')}</p>
          <p className="text-ink/80">{t('scan.consentBody2')}</p>
          <button
            type="button"
            onClick={() => openExternal('https://www.anthropic.com/legal/privacy')}
            className="self-start text-[14.5px] font-semibold text-ink underline underline-offset-4"
          >
            {t('scan.consentLink')}
          </button>
          <Button block className="mt-2" onClick={agree}>
            {t('scan.consentAgree')}
          </Button>
          <Button variant="quiet" block onClick={() => setConsentFor(undefined)}>
            {t('scan.consentLater')}
          </Button>
        </div>
      </Sheet>
    </>
  )
}
