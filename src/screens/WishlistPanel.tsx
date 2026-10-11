import { useMemo, useState } from 'react'
import { ShoppingBag, Trash2 } from 'lucide-react'
import type { Item } from '../domain/types'
import { deleteItem, restoreItem, updateItem, useItems, useWears } from '../data'
import { coolingOffState, nearestFrequency, projectedCpw, similarOwned } from '../domain/buying'
import { buildWearIndex } from '../domain/wearStats'
import { formatDate, formatMoney, t } from '../i18n'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useBack } from '../ui/TopBar'
import { useToast } from '../ui/Toast'
import { useToday } from '../ui/useToday'
import { frequencyLabel, SimilarStrip } from './BeforeYouBuyScreen'

/** A wishlist piece: cooling-off, the projected cost per wear, similar pieces owned, buy or let go. */
export function WishlistPanel({ item }: { item: Item }) {
  const today = useToday()
  const items = useItems()
  const wears = useWears()
  const toast = useToast()
  const back = useBack('/before-you-buy')
  const [confirming, setConfirming] = useState(false)

  const wearIndex = useMemo(() => buildWearIndex(wears ?? []), [wears])
  const similar = useMemo(() => similarOwned(items ?? [], item.category, item.colour, wearIndex), [items, item, wearIndex])
  const cooling = coolingOffState(item, today)
  const frequency = item.wishlist ? nearestFrequency(item.wishlist.wearsPerMonth) : undefined
  const year = item.price && item.wishlist ? projectedCpw(item.price.amount, item.wishlist.wearsPerMonth, 12) : undefined

  const markBought = async () => {
    setConfirming(false)
    const before = { kind: item.kind, wishlist: item.wishlist, purchaseDate: item.purchaseDate, status: item.status }
    await updateItem(item.id, { kind: 'owned', status: 'active', purchaseDate: today, wishlist: undefined })
    toast(t('wishlist.welcome', { name: item.name }), { label: t('common.undo'), onClick: () => void updateItem(item.id, before) })
  }

  const remove = async () => {
    await deleteItem(item.id)
    back()
    toast(t('wishlist.removed', { name: item.name }), { label: t('common.undo'), onClick: () => void restoreItem(item.id) })
  }

  return (
    <>
      <section className={`mt-5 rounded-[22px] p-5 ${cooling.active ? 'bg-tint-bez' : 'bg-tint-mieta'}`} aria-labelledby="cooling-title">
        <h3 id="cooling-title" className="label-caps">
          {t('wishlist.coolingTitle')}
        </h3>
        <p className="mt-1 text-[15px]">
          {cooling.active ? t('wishlist.coolingActive', { count: cooling.daysLeft }) : cooling.until ? t('wishlist.coolingOver') : t('wishlist.noCooling')}
        </p>
        {cooling.active && cooling.until && <p className="mt-0.5 text-[13.5px] text-ink/65">{formatDate(cooling.until, 'weekday')}</p>}
        {year !== undefined && frequency && item.price && (
          <p className="mt-3 text-[14px] text-ink/80">
            {t('wishlist.projection', {
              frequency: t(frequencyLabel(frequency)).toLocaleLowerCase(),
              amount: formatMoney({ amount: year, currency: item.price.currency }),
            })}
          </p>
        )}
        <Button className="mt-4 min-h-11" block icon={<ShoppingBag size={17} aria-hidden="true" />} onClick={() => (cooling.active ? setConfirming(true) : void markBought())}>
          {t('wishlist.bought')}
        </Button>
      </section>

      <section className="mt-5">
        <h3 className="label-caps mb-1">{t('beforeYouBuy.similarTitle')}</h3>
        <p className="mb-3 text-[14px] text-ink/80">
          {similar.length > 0 ? t('beforeYouBuy.similarCount', { count: similar.length }) : t('beforeYouBuy.similarNone')}
        </p>
        {similar.length > 0 && (
          <div className="px-5">
            <SimilarStrip items={similar} wears={wearIndex} />
          </div>
        )}
      </section>

      <Button variant="quiet" className="mt-6 text-muted" icon={<Trash2 size={17} aria-hidden="true" />} onClick={remove}>
        {t('wishlist.remove')}
      </Button>

      <ConfirmDialog
        open={confirming}
        title={t('wishlist.boughtTitle')}
        confirmLabel={t('wishlist.boughtConfirm')}
        onConfirm={() => void markBought()}
        onCancel={() => setConfirming(false)}
      >
        {t('wishlist.boughtBody', { count: cooling.daysLeft })}
      </ConfirmDialog>
    </>
  )
}
