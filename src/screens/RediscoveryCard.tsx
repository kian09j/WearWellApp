import { useMemo } from 'react'
import { Link } from 'react-router'
import type { DateKey } from '../domain/types'
import type { Rediscovery } from '../domain/rediscovery'
import { logWear, unlogWear, updateSettings, useSettings } from '../data'
import { formatDate, t } from '../i18n'
import { tapFeedback } from '../platform/haptics'
import { Button } from '../ui/Button'
import { Flower } from '../ui/Flower'
import { ItemThumb } from '../ui/ItemThumb'
import { useToast } from '../ui/Toast'

/** Skipped pieces for today (the list resets itself when the date changes). */
export function useSkippedToday(today: DateKey): ReadonlySet<string> {
  const settings = useSettings()
  const r = settings?.rediscovery
  const key = r && r.date === today ? r.skipped.join(',') : ''
  return useMemo(() => new Set(key ? key.split(',') : []), [key])
}

/** One piece that has been waiting a while, offered gently. Never a warning. */
export function RediscoveryCard({ pick, today, skipped }: { pick: Rediscovery; today: DateKey; skipped: ReadonlySet<string> }) {
  const toast = useToast()
  const { item, lastWorn } = pick

  if (pick.wornToday) {
    return (
      <section className="mb-5 flex items-center gap-4 rounded-[24px] bg-tint-mieta p-4">
        <Link to={`/item/${item.id}`} className="h-16 w-14 shrink-0 overflow-hidden rounded-2xl bg-card" aria-hidden="true" tabIndex={-1}>
          <ItemThumb item={item} iconSize={26} />
        </Link>
        <div className="min-w-0">
          <p className="label-caps inline-flex items-center gap-1.5 !text-koniczyna-ink">
            <Flower size={14} petal="var(--color-koniczyna)" inner="var(--color-card)" />
            {t('rediscovery.welcomeEyebrow')}
          </p>
          <p className="mt-0.5 text-[15px]">{t('rediscovery.welcomeBody', { name: item.name })}</p>
        </div>
      </section>
    )
  }

  const wear = async () => {
    tapFeedback()
    await logWear(item.id, today)
    toast(t('rediscovery.logged', { name: item.name }), { label: t('common.undo'), onClick: () => void unlogWear(item.id, today) })
  }

  const skip = () => updateSettings({ rediscovery: { date: today, skipped: [...skipped, item.id] } })

  const lastText = lastWorn
    ? t('rediscovery.lastWorn', { date: formatDate(lastWorn, lastWorn.slice(0, 4) === today.slice(0, 4) ? 'dayMonth' : 'medium') })
    : t('rediscovery.neverWorn')

  return (
    <section className="mb-5 rounded-[24px] bg-tint-bez p-4" aria-labelledby="rediscovery-name">
      <div className="flex gap-4">
        <Link to={`/item/${item.id}`} className="h-[92px] w-[74px] shrink-0 overflow-hidden rounded-2xl bg-card shadow-sm" tabIndex={-1} aria-hidden="true">
          <ItemThumb item={item} iconSize={32} />
        </Link>
        <div className="min-w-0">
          <p className="label-caps">{t('rediscovery.eyebrow')}</p>
          <h2 id="rediscovery-name" className="mt-0.5 text-[1.3rem] leading-tight">
            <Link to={`/item/${item.id}`} className="hover:underline">
              {item.name}
            </Link>
          </h2>
          <p className="mt-1 text-[14px] leading-snug text-ink/75">
            {lastText} {t('rediscovery.prompt')}
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button className="min-h-11 flex-1 px-4" onClick={wear}>
          {t('rediscovery.wear')}
        </Button>
        <Button variant="quiet" className="min-h-11 px-4" onClick={() => void skip()}>
          {t('rediscovery.skip')}
        </Button>
      </div>
    </section>
  )
}
