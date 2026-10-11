import { Link } from 'react-router'
import type { DateKey, Item } from '../domain/types'
import { cpwAfterNextWear, itemCpw, targetProgress } from '../domain/cpw'
import { useSettings } from '../data'
import { formatDate, formatMoney, t } from '../i18n'
import { ProgressBar } from '../ui/ProgressBar'

/** The piece's cost per wear, what the next wear does, and progress towards the category target. */
export function CpwCard({ item, wears, lastWorn }: { item: Item; wears: number; lastWorn?: DateKey }) {
  const settings = useSettings()
  const cpw = itemCpw(item, wears)
  const wornText = wears > 0 ? t('item.wornCount', { count: wears }) : t('item.neverWorn')
  const lastText = lastWorn ? `, ${t('item.lastWorn', { date: formatDate(lastWorn, 'dayMonth') })}` : ''

  // a category target applies when the piece is priced in the same currency as the target
  const targetAmount = settings?.targetCpw[item.category]
  const target =
    targetAmount && item.price && item.price.currency === settings?.currency
      ? { amount: targetAmount, money: formatMoney({ amount: targetAmount, currency: item.price.currency }) }
      : undefined
  const progress = target && item.price ? targetProgress(item.price.amount, wears, target.amount) : undefined

  return (
    <section className="mt-5 rounded-[22px] bg-tint-mieta p-5" aria-labelledby="cpw-title">
      <h3 id="cpw-title" className="label-caps">
        {t('cpw.title')}
      </h3>

      {cpw.kind === 'cpw' && (
        <>
          <p className="mt-1 font-display text-[2.5rem] leading-none lining-nums tabular-nums">
            {formatMoney(cpw.value)}
            <span className="ml-2 font-sans text-[15px] text-ink/70">{t('cpw.perWear')}</span>
          </p>
          <p className="mt-3 text-[14.5px]">
            {t('cpw.paid', { price: formatMoney(cpw.price) })} · {wornText}
            {lastText}
          </p>
          <p className="mt-0.5 text-[14px] text-ink/70">{t('cpw.nextWear', { amount: formatMoney(cpwAfterNextWear(cpw.price, wears)) })}</p>
        </>
      )}

      {cpw.kind === 'notWorn' && (
        <>
          <p className="mt-1 font-hand text-[2rem] leading-tight text-ink/55">{t('cpw.notWorn')}</p>
          <p className="mt-2 text-[14.5px]">
            {t('cpw.paid', { price: formatMoney(cpw.price) })} · {t('cpw.firstWear', { amount: formatMoney(cpw.price) })}
          </p>
        </>
      )}

      {cpw.kind === 'noPrice' && (
        <>
          <p className="mt-1 text-[1.15rem] font-semibold">{t('cpw.noPrice')}</p>
          <p className="mt-1 text-[14.5px] text-ink/75">
            {wornText}
            {lastText}. {t('cpw.noPriceBody')}
          </p>
          <Link
            to={`/item/${item.id}/edit`}
            className="mt-3 inline-flex min-h-11 items-center rounded-full bg-card px-5 text-[14px] font-semibold shadow-sm"
          >
            {t('cpw.addPrice')}
          </Link>
        </>
      )}

      {target && progress && (
        <div className="mt-4">
          <ProgressBar
            ratio={progress.ratio}
            label={progress.reached ? t('cpw.targetReached', { target: target.money }) : t('cpw.toTarget', { count: progress.wearsNeeded, target: target.money })}
          />
          <p className="mt-1.5 text-[13.5px] font-semibold text-koniczyna-ink">
            {progress.reached ? t('cpw.targetReached', { target: target.money }) : t('cpw.toTarget', { count: progress.wearsNeeded, target: target.money })}
          </p>
        </div>
      )}
    </section>
  )
}
