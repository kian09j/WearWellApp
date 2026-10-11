import { Link, useNavigate } from 'react-router'
import { loadSampleData, updateSettings, useSettings } from '../data'
import { CURRENCIES, isCurrencyCode } from '../domain/money'
import { t, type TKey } from '../i18n'
import { Button } from '../ui/Button'
import { Flower, Wordmark } from '../ui/Flower'

const POINTS: { key: TKey; petal: string }[] = [
  { key: 'welcome.point1', petal: 'var(--color-koniczyna)' },
  { key: 'welcome.point2', petal: 'var(--color-chaber)' },
  { key: 'welcome.point3', petal: 'var(--color-slonecznik)' },
]

export function WelcomeScreen() {
  const settings = useSettings()
  const navigate = useNavigate()

  const exploreSample = async () => {
    await loadSampleData()
    navigate('/', { replace: true })
  }

  const startEmpty = async () => {
    await updateSettings({ onboarded: true })
    navigate('/wardrobe', { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pt-safe pb-safe">
      <div className="relative flex-1 pt-8">
        <Wordmark className="text-[1.7rem]" />
        <div className="pointer-events-none absolute top-6 right-0 flex items-start" aria-hidden="true">
          <Flower size={54} className="translate-y-6" petal="var(--color-chaber)" inner="var(--color-card)" />
          <Flower size={82} />
        </div>

        <h1 className="mt-14 text-[2.75rem] leading-[1.02]">
          {t('welcome.title')} <span className="wonk text-mak">{t('welcome.titleAccent')}</span>
        </h1>

        <ul className="mt-7 space-y-4">
          {POINTS.map(({ key, petal }) => (
            <li key={key} className="flex items-start gap-3 text-[16.5px] leading-snug">
              <Flower size={22} petal={petal} inner="var(--color-card)" className="mt-0.5 shrink-0" />
              {t(key)}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2 pt-8 pb-6">
        <label className="mb-2 flex items-center justify-center gap-2 text-[14px] text-muted">
          {t('welcome.currency')}
          <select
            value={settings?.currency ?? 'PLN'}
            onChange={(e) => isCurrencyCode(e.target.value) && void updateSettings({ currency: e.target.value })}
            className="min-h-10 rounded-full border-[1.5px] border-ink/15 bg-card px-3 font-semibold text-ink"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <Link
          to="/welcome/count"
          className="inline-flex min-h-13 items-center justify-center rounded-full bg-mak px-6 text-[16px] font-semibold text-card shadow-[0_10px_22px_-12px_rgb(199_62_34/0.9)] hover:bg-mak-strong"
        >
          {t('welcome.start')}
        </Link>
        <Button variant="ghost" onClick={exploreSample}>
          {t('welcome.sample')}
        </Button>
        <Button variant="quiet" onClick={startEmpty}>
          {t('welcome.empty')}
        </Button>
        <Link to="/import" className="mt-1 text-center text-[14px] font-semibold text-ink/75 underline underline-offset-4">
          {t('welcome.importCsv')}
        </Link>
        <p className="mt-2 text-center text-[13px] text-muted">{t('welcome.privacy')}</p>
      </div>
    </div>
  )
}
