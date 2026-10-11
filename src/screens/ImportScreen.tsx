import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Download, FileUp } from 'lucide-react'
import type { CurrencyCode } from '../domain/types'
import { importPieces, undoImport, updateSettings, useItems, useSettings } from '../data'
import { normalizeSearch } from '../domain/catalogue'
import { decodeCsvBytes, parseCsv } from '../domain/csv'
import { buildImport, CSV_TEMPLATE, guessMapping, IMPORT_FIELDS, type ColumnMapping, type ImportField } from '../domain/csvImport'
import { CURRENCIES, isCurrencyCode } from '../domain/money'
import { formatMoney, t } from '../i18n'
import { pickFile, saveTextFile } from '../platform/files'
import { Button } from '../ui/Button'
import { CategoryIcon } from '../ui/CategoryIcon'
import { TopBar, useBack } from '../ui/TopBar'
import { useToast } from '../ui/Toast'
import { useToday } from '../ui/useToday'

const PREVIEW = 8

interface LoadedFile {
  name: string
  headers: string[]
  rows: string[][]
}

export function ImportScreen() {
  const items = useItems()
  const settings = useSettings()
  const today = useToday()
  const back = useBack('/settings')
  const navigate = useNavigate()
  const toast = useToast()

  const [file, setFile] = useState<LoadedFile>()
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [currency, setCurrency] = useState<CurrencyCode>()
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const cur = currency ?? settings?.currency ?? 'PLN'
  const existingNames = useMemo(
    () => new Set((items ?? []).filter((i) => i.kind === 'owned').map((i) => normalizeSearch(i.name))),
    [items],
  )
  const result = useMemo(
    () =>
      file
        ? buildImport(file.rows, mapping, {
            currency: cur,
            today,
            existingNames,
            nameForCategory: (c) => t(`categorySingular.${c}`),
          })
        : undefined,
    [file, mapping, cur, today, existingNames],
  )
  const toImport = result ? result.pieces.filter((p) => !(skipDuplicates && p.duplicate)) : []
  const duplicates = result?.pieces.filter((p) => p.duplicate).length ?? 0
  const guessed = toImport.filter((p) => p.categoryGuessed).length
  const hasWears = toImport.some((p) => p.item.priorWears || p.lastWorn)

  const choose = async () => {
    setError(undefined)
    const picked = await pickFile('.csv,text/csv,text/plain,.txt,.tsv')
    if (!picked) return
    try {
      const rows = parseCsv(decodeCsvBytes(await picked.arrayBuffer()))
      if (rows.length < 2) {
        setError(t('csv.noRows'))
        return
      }
      const [headers, ...data] = rows as [string[], ...string[][]]
      setFile({ name: picked.name, headers, rows: data })
      setMapping(guessMapping(headers))
    } catch {
      setError(t('csv.readFailed'))
    }
  }

  const run = async () => {
    if (!toImport.length) return
    setBusy(true)
    const ids = await importPieces(toImport)
    await updateSettings({ onboarded: true })
    navigate('/wardrobe', { replace: true })
    toast(t('csv.imported', { count: ids.length }), { label: t('common.undo'), onClick: () => void undoImport(ids) })
  }

  const sample = (column: number) => file?.rows.find((r) => (r[column] ?? '').trim())?.[column]?.trim()

  return (
    <>
      <TopBar title={t('csv.title')} onBack={back} />
      <div className="mx-auto flex max-w-lg flex-col gap-5 px-4 pb-32">
        <section className="card-soft p-5">
          <p className="text-[15px] leading-relaxed text-ink/85">{t('csv.intro')}</p>
          <div className="mt-4 flex flex-col gap-2">
            <Button icon={<FileUp size={18} aria-hidden="true" />} onClick={() => void choose()}>
              {file ? t('csv.chooseOther') : t('csv.choose')}
            </Button>
            <Button
              variant="quiet"
              icon={<Download size={17} aria-hidden="true" />}
              onClick={() => void saveTextFile('wearwell-template.csv', CSV_TEMPLATE, 'text/csv').catch(() => {})}
            >
              {t('csv.template')}
            </Button>
          </div>
          <p className="mt-2 text-[13.5px] text-muted">{t('csv.templateHint')}</p>
          <p className="mt-1 text-[13.5px] text-muted">{t('csv.photosNote')}</p>
          {error && (
            <p className="mt-3 text-[14px] font-semibold text-mak" role="alert">
              {error}
            </p>
          )}
        </section>

        {file && result && (
          <>
            <p className="px-1 text-[14px] text-muted">{t('csv.file', { name: file.name, count: t('csv.rows', { count: file.rows.length }) })}</p>

            <section className="card-soft p-5" aria-labelledby="match-title">
              <h2 id="match-title" className="text-[1.35rem] leading-tight">
                {t('csv.matchTitle')}
              </h2>
              <p className="mt-1 mb-4 text-[14px] text-muted">{t('csv.matchHint')}</p>
              <div className="flex flex-col gap-3">
                {IMPORT_FIELDS.map((field: ImportField) => {
                  const column = mapping[field]
                  const example = column !== undefined ? sample(column) : undefined
                  return (
                    <label key={field} className="grid grid-cols-[7.5rem_1fr] items-center gap-3">
                      <span className="text-[14.5px] font-semibold">{t(`csv.fields.${field}`)}</span>
                      <span className="min-w-0">
                        <select
                          value={column ?? ''}
                          onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value === '' ? undefined : Number(e.target.value) }))}
                          className="min-h-11 w-full rounded-xl border-[1.5px] border-ink/35 bg-card px-3 text-[15px] focus:border-mak focus:outline-none"
                        >
                          <option value="">{t('csv.notInFile')}</option>
                          {file.headers.map((h, i) => (
                            <option key={i} value={i}>
                              {h || `#${i + 1}`}
                            </option>
                          ))}
                        </select>
                        {example && <span className="mt-0.5 block truncate text-[12.5px] text-muted">{t('csv.example', { value: example })}</span>}
                      </span>
                    </label>
                  )
                })}
                <label className="grid grid-cols-[7.5rem_1fr] items-center gap-3 border-t border-thread pt-3">
                  <span className="text-[13.5px] leading-tight font-semibold">{t('csv.defaultCurrency')}</span>
                  <select
                    value={cur}
                    onChange={(e) => isCurrencyCode(e.target.value) && setCurrency(e.target.value)}
                    className="min-h-11 w-full rounded-xl border-[1.5px] border-ink/35 bg-card px-3 text-[15px] focus:border-mak focus:outline-none"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="rounded-[28px] bg-tint-mieta p-5" aria-labelledby="preview-title" aria-live="polite">
              <h2 id="preview-title" className="text-[1.35rem] leading-tight">
                {t('csv.previewTitle')}
              </h2>
              <p className="mt-1 text-[15px] font-semibold">{t('csv.ready', { count: toImport.length })}</p>
              {result.skipped.length > 0 && (
                <p className="mt-1 text-[14px] text-ink/80">
                  {t('csv.skippedRows', { count: result.skipped.length, rows: result.skipped.slice(0, 6).map((s) => s.row).join(', ') })}
                </p>
              )}
              {guessed > 0 && <p className="mt-1 text-[14px] text-ink/80">{t('csv.unknownCategories', { count: guessed })}</p>}
              {duplicates > 0 && (
                <div className="mt-2">
                  <p className="text-[14px] text-ink/80">{t('csv.duplicates', { count: duplicates })}</p>
                  <label className="mt-1.5 flex cursor-pointer items-center gap-2.5">
                    <input type="checkbox" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} className="h-5 w-5 accent-mak" />
                    <span className="text-[14.5px] font-semibold">{t('csv.skipDuplicates')}</span>
                  </label>
                </div>
              )}
              {hasWears && <p className="mt-2 text-[13.5px] text-ink/70">{t('csv.priorWearsNote')}</p>}

              {toImport.length > 0 && (
                <ul className="mt-4 flex flex-col gap-1.5">
                  {toImport.slice(0, PREVIEW).map((p) => (
                    <li key={p.row} className="flex items-center gap-3 rounded-2xl bg-card/80 px-3 py-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sand text-ink/70" aria-hidden="true">
                        <CategoryIcon category={p.item.category} size={20} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-semibold">{p.item.name}</span>
                        <span className="block truncate text-[12.5px] text-muted">
                          {t(`categories.${p.item.category}`)}
                          {p.item.colour && ` · ${t(`colours.${p.item.colour}`)}`}
                        </span>
                      </span>
                      {p.item.price && <span className="shrink-0 text-[13.5px] tabular-nums">{formatMoney(p.item.price)}</span>}
                    </li>
                  ))}
                  {toImport.length > PREVIEW && <li className="px-3 text-[13.5px] text-muted">{t('csv.more', { count: toImport.length - PREVIEW })}</li>}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      {file && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-thread bg-paper/95 pb-safe backdrop-blur-sm">
          <div className="mx-auto max-w-lg px-4 py-3">
            <Button block disabled={!toImport.length || busy} onClick={() => void run()}>
              {toImport.length ? t('csv.importButton', { count: toImport.length }) : t('csv.nothing')}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
