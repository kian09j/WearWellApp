import { useId, useState, type ReactNode } from 'react'
import { Download, ExternalLink, Sparkles, Trash2, Upload, X } from 'lucide-react'
import {
  BackupError,
  backupFileName,
  createBackup,
  eraseEverything,
  loadSampleData,
  parseBackup,
  removeSampleData,
  restoreBackup,
  summarizeBackup,
  updateSettings,
  useHasSampleData,
  useSettings,
  type BackupFile,
} from '../data'
import { CURRENCIES, isCurrencyCode } from '../domain/money'
import { VINTED_COUNTRIES } from '../domain/vinted'
import { formatRegion, formatTimestamp, t } from '../i18n'
import { pickFile, saveTextFile } from '../platform/files'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Wordmark } from '../ui/Flower'
import { Screen } from '../ui/Screen'
import { useToast } from '../ui/Toast'
import { NudgeSettings } from './NudgeSettings'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-7 first:mt-0">
      <h2 className="label-caps mb-2.5 px-1">{title}</h2>
      <div className="card-soft overflow-hidden">{children}</div>
    </section>
  )
}

function ActionRow({ icon, title, hint, onClick }: { icon: ReactNode; title: string; hint: string; onClick: () => void }) {
  const id = useId()
  return (
    <button
      type="button"
      onClick={onClick}
      aria-labelledby={`${id}-t`}
      aria-describedby={`${id}-h`}
      className="flex w-full items-center gap-4 border-b border-thread px-5 py-4 text-left last:border-b-0 hover:bg-sand/60"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand text-ink" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0">
        <span id={`${id}-t`} className="block font-semibold">
          {title}
        </span>
        <span id={`${id}-h`} className="block text-[13.5px] leading-snug text-muted">
          {hint}
        </span>
      </span>
    </button>
  )
}

export function SettingsScreen() {
  const settings = useSettings()
  const hasSample = useHasSampleData()
  const toast = useToast()
  const [pendingImport, setPendingImport] = useState<BackupFile | null>(null)
  const [confirmErase, setConfirmErase] = useState(false)

  const exportBackup = async () => {
    const backup = await createBackup()
    saveTextFile(backupFileName(), JSON.stringify(backup))
    toast(t('settings.exported'))
  }

  const chooseImport = async () => {
    const file = await pickFile('.json,application/json')
    if (!file) return
    try {
      setPendingImport(parseBackup(await file.text()))
    } catch (err) {
      if (!(err instanceof BackupError)) console.error(err)
      toast(t('settings.importFailed'))
    }
  }

  const runImport = async () => {
    if (!pendingImport) return
    await restoreBackup(pendingImport)
    setPendingImport(null)
    toast(t('settings.imported'))
  }

  const summary = pendingImport ? summarizeBackup(pendingImport) : null

  return (
    <Screen title={t('settings.title')} noSettings>
      <Section title={t('settings.preferences')}>
        <div className="px-5 py-4">
          <label htmlFor="currency" className="block font-semibold">
            {t('settings.currency')}
          </label>
          <p id="currency-hint" className="text-[13.5px] text-muted">
            {t('settings.currencyHint')}
          </p>
          <select
            id="currency"
            aria-describedby="currency-hint"
            className="mt-3 min-h-12 w-full rounded-2xl border-[1.5px] border-ink/15 bg-paper px-4 text-[15px]"
            value={settings?.currency ?? 'PLN'}
            onChange={(e) => {
              if (isCurrencyCode(e.target.value)) void updateSettings({ currency: e.target.value })
            }}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {t(`currencies.${c}`)}
              </option>
            ))}
          </select>
        </div>
      </Section>

      {settings && (
        <Section title={t('settings.vinted')}>
          <div className="flex flex-col gap-4 px-5 py-4">
            <div>
              <label htmlFor="vinted-country" className="block font-semibold">
                {t('settings.vintedCountry')}
              </label>
              <p id="vinted-country-hint" className="text-[13.5px] text-muted">
                {t('settings.vintedCountryHint')}
              </p>
              <select
                id="vinted-country"
                aria-describedby="vinted-country-hint"
                value={settings.vintedCountry}
                onChange={(e) => void updateSettings({ vintedCountry: e.target.value })}
                className="mt-2 min-h-12 w-full rounded-2xl border-[1.5px] border-ink/15 bg-paper px-4 text-[15px]"
              >
                {[...VINTED_COUNTRIES]
                  .map((c) => ({ ...c, name: formatRegion(c.code) }))
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.domain})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label htmlFor="listing-language" className="block font-semibold">
                {t('settings.listingLanguage')}
              </label>
              <p id="listing-language-hint" className="text-[13.5px] text-muted">
                {t('settings.listingLanguageHint')}
              </p>
              <select
                id="listing-language"
                aria-describedby="listing-language-hint"
                value={settings.listingLanguage}
                onChange={(e) => void updateSettings({ listingLanguage: e.target.value === 'en' ? 'en' : 'pl' })}
                className="mt-2 min-h-12 w-full rounded-2xl border-[1.5px] border-ink/15 bg-paper px-4 text-[15px]"
              >
                <option value="pl">{t('sell.polish')}</option>
                <option value="en">{t('sell.english')}</option>
              </select>
            </div>
          </div>
        </Section>
      )}

      {settings && (
        <Section title={t('settings.nudges')}>
          <NudgeSettings key={Object.values(settings.nudgeDays).join()} settings={settings} />
        </Section>
      )}

      <Section title={t('settings.data')}>
        <p className="border-b border-thread bg-tint-mieta/60 px-5 py-4 text-[14px] leading-relaxed text-ink/80">
          {t('settings.dataPrivacy')}
        </p>
        <ActionRow icon={<Download size={18} />} title={t('settings.export')} hint={t('settings.exportHint')} onClick={exportBackup} />
        <ActionRow icon={<Upload size={18} />} title={t('settings.import')} hint={t('settings.importHint')} onClick={chooseImport} />
      </Section>

      <Section title={t('settings.sample')}>
        {hasSample ? (
          <ActionRow
            icon={<X size={18} />}
            title={t('settings.removeSample')}
            hint={t('settings.removeSampleHint')}
            onClick={async () => {
              await removeSampleData()
              toast(t('settings.sampleRemoved'))
            }}
          />
        ) : (
          <ActionRow
            icon={<Sparkles size={18} />}
            title={t('settings.loadSample')}
            hint={t('settings.sampleHint')}
            onClick={async () => {
              await loadSampleData()
              toast(t('settings.sampleLoaded'))
            }}
          />
        )}
        <ActionRow icon={<Trash2 size={18} />} title={t('settings.erase')} hint={t('settings.eraseHint')} onClick={() => setConfirmErase(true)} />
      </Section>

      <Section title={t('settings.about')}>
        <div className="px-5 py-5">
          <Wordmark className="text-[1.9rem]" />
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink/80">{t('settings.aboutBody')}</p>
          <a
            href="https://polskapicks.com"
            target="_blank"
            rel="noopener"
            className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-full border-[1.5px] border-ink/15 px-5 text-[15px] font-semibold hover:border-ink/45"
          >
            {t('settings.visitPolskaPicks')}
            <ExternalLink size={16} aria-hidden="true" />
          </a>
          <p className="mt-4 text-[13px] text-muted">{t('settings.version', { version: __APP_VERSION__ })}</p>
        </div>
      </Section>

      <ConfirmDialog
        open={!!pendingImport}
        title={t('settings.importConfirmTitle')}
        confirmLabel={t('settings.importConfirm')}
        onConfirm={runImport}
        onCancel={() => setPendingImport(null)}
      >
        {summary &&
          t('settings.importConfirmBody', {
            date: formatTimestamp(summary.exportedAt),
            items: t('common.items', { count: summary.items }),
            wears: t('common.wears', { count: summary.wears }),
          })}
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmErase}
        title={t('settings.eraseConfirmTitle')}
        confirmLabel={t('settings.eraseConfirm')}
        onConfirm={async () => {
          await eraseEverything()
          setConfirmErase(false)
          toast(t('settings.erased'))
        }}
        onCancel={() => setConfirmErase(false)}
      >
        {t('settings.eraseConfirmBody')}
      </ConfirmDialog>
    </Screen>
  )
}
