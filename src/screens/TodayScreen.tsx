import { Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router'
import { loadSampleData, useItems, useWears } from '../data'
import { today } from '../domain/dates'
import { formatDate, t } from '../i18n'
import { Button } from '../ui/Button'
import { Flower } from '../ui/Flower'
import { Screen } from '../ui/Screen'
import { useToast } from '../ui/Toast'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return t('today.greetingMorning')
  if (hour < 18) return t('today.greetingAfternoon')
  return t('today.greetingEvening')
}

export function TodayScreen() {
  const items = useItems()
  const wears = useWears()
  const toast = useToast()
  const navigate = useNavigate()

  const owned = items?.filter((i) => i.kind === 'owned') ?? []

  const loadSample = async () => {
    await loadSampleData()
    toast(t('settings.sampleLoaded'))
    navigate('/')
  }

  return (
    <Screen eyebrow={formatDate(today(), 'weekday')} title={greeting()}>
      {items === undefined ? null : owned.length === 0 ? (
        <section className="card-soft flex flex-col items-center px-6 py-10 text-center">
          <Flower size={72} />
          <h2 className="mt-5 text-[1.7rem] leading-tight">{t('today.emptyTitle')}</h2>
          <p className="mt-2 max-w-xs text-muted">{t('today.emptyBody')}</p>
          <Button className="mt-6" icon={<Sparkles size={18} aria-hidden="true" />} onClick={loadSample}>
            {t('today.loadSample')}
          </Button>
        </section>
      ) : (
        <section className="rounded-[28px] bg-tint-mieta p-6">
          <Flower size={44} petal="var(--color-koniczyna)" inner="var(--color-card)" />
          <h2 className="mt-4 text-[1.6rem] leading-tight">{t('today.previewTitle')}</h2>
          <p className="mt-2 text-ink/80">
            {t('today.previewBody', {
              items: t('common.items', { count: owned.length }),
              wears: t('common.wears', { count: wears?.length ?? 0 }),
            })}
          </p>
        </section>
      )}
    </Screen>
  )
}
