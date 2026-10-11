import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Gift, Heart, Sparkles } from 'lucide-react'
import type { DateKey, Item, ItemStatus } from '../domain/types'
import { keepPauseUntil, snoozeUntil, type Nudge } from '../domain/nudges'
import { logWear, unlogWear, updateItem } from '../data'
import { t, type TKey } from '../i18n'
import { tapFeedback } from '../platform/haptics'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { ItemThumb } from '../ui/ItemThumb'
import { Sheet } from '../ui/Sheet'
import { useToast } from '../ui/Toast'

const COPY: Record<1 | 2 | 3, { eyebrow: TKey; title: TKey; body: TKey }> = {
  1: { eyebrow: 'nudges.eyebrow1', title: 'nudges.title1', body: 'nudges.body1' },
  2: { eyebrow: 'nudges.eyebrow2', title: 'nudges.title2', body: 'nudges.body2' },
  3: { eyebrow: 'nudges.eyebrow3', title: 'nudges.title3', body: 'nudges.body3' },
}

const textButton = 'min-h-11 rounded-full px-3 text-[14px] font-semibold text-ink/75 hover:bg-card/60'

/** A gentle, dismissable nudge. Every action can be undone. */
export function NudgeCard({ nudge, today, showThumb = true }: { nudge: Nudge; today: DateKey; showThumb?: boolean }) {
  const { item, stage, unwornDays } = nudge
  const [keeping, setKeeping] = useState(false)
  const [donating, setDonating] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()
  const copy = COPY[stage]

  const restore = (prev: Pick<Item, 'status' | 'nudge'>) => () => void updateItem(item.id, { status: prev.status, nudge: prev.nudge })
  const before = { status: item.status, nudge: item.nudge }

  const wear = async () => {
    tapFeedback()
    await logWear(item.id, today)
    toast(t('nudges.worn', { name: item.name }), { label: t('common.undo'), onClick: () => void unlogWear(item.id, today) })
  }

  const later = async () => {
    await updateItem(item.id, { nudge: { ...item.nudge, snoozedUntil: snoozeUntil(today) } })
    toast(t('nudges.snoozed'), { label: t('common.undo'), onClick: restore(before) })
  }

  const keepAs = async (status: ItemStatus) => {
    setKeeping(false)
    await updateItem(item.id, { status })
    toast(t('nudges.kept', { name: item.name }), { label: t('common.undo'), onClick: restore(before) })
  }

  const keepOther = async () => {
    setKeeping(false)
    await updateItem(item.id, { nudge: { ...item.nudge, pausedUntil: keepPauseUntil(today), keepReason: 'other' } })
    toast(t('nudges.keptPaused'), { label: t('common.undo'), onClick: restore(before) })
  }

  const donate = async () => {
    setDonating(false)
    await updateItem(item.id, { status: 'donated' })
    toast(t('nudges.donated', { name: item.name }), { label: t('common.undo'), onClick: restore(before) })
  }

  const sell = () => navigate(`/item/${item.id}/sell`)

  return (
    <section className={`rounded-[24px] p-4 ${stage === 3 ? 'bg-tint-maslo' : 'bg-tint-bez'}`} aria-labelledby={`nudge-${item.id}`}>
      <div className="flex gap-4">
        {showThumb && (
          <Link to={`/item/${item.id}`} className="h-[92px] w-[74px] shrink-0 overflow-hidden rounded-2xl bg-card shadow-sm" tabIndex={-1} aria-hidden="true">
            <ItemThumb item={item} iconSize={32} />
          </Link>
        )}
        <div className="min-w-0">
          <p className="label-caps">{t(copy.eyebrow)}</p>
          <h2 id={`nudge-${item.id}`} className="mt-0.5 text-[1.25rem] leading-tight">
            {showThumb ? (
              <Link to={`/item/${item.id}`} className="hover:underline">
                {t(copy.title, { name: item.name })}
              </Link>
            ) : (
              t(copy.title, { name: item.name })
            )}
          </h2>
          <p className="mt-1 text-[14px] leading-snug text-ink/75">
            {t('nudges.resting', { count: unwornDays })} {t(copy.body)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1">
        {stage === 1 && (
          <>
            <Button className="min-h-11 flex-1 px-4" onClick={wear}>
              {t('nudges.wear')}
            </Button>
            <button type="button" className={textButton} onClick={() => void later()}>
              {t('nudges.later')}
            </button>
          </>
        )}
        {stage === 2 && (
          <>
            <div className="grid w-full grid-cols-3 gap-2">
              <Button variant="ghost" className="min-h-11 px-2" onClick={() => setKeeping(true)}>
                {t('nudges.keep')}
              </Button>
              <Button variant="ghost" className="min-h-11 px-2" onClick={sell}>
                {t('nudges.sell')}
              </Button>
              <Button variant="ghost" className="min-h-11 px-2" onClick={() => setDonating(true)}>
                {t('nudges.donate')}
              </Button>
            </div>
            <button type="button" className={`${textButton} mt-1`} onClick={() => void later()}>
              {t('nudges.later')}
            </button>
          </>
        )}
        {stage === 3 && (
          <>
            <Button className="min-h-11 w-full px-4" icon={<Sparkles size={17} aria-hidden="true" />} onClick={sell}>
              {t('nudges.sellVinted')}
            </Button>
            <button type="button" className={`${textButton} mt-1`} onClick={() => setKeeping(true)}>
              {t('nudges.keep')}
            </button>
            <button type="button" className={`${textButton} mt-1`} onClick={() => setDonating(true)}>
              {t('nudges.donate')}
            </button>
            <button type="button" className={`${textButton} mt-1`} onClick={() => void later()}>
              {t('nudges.later')}
            </button>
          </>
        )}
      </div>

      <Sheet open={keeping} title={t('nudges.keepTitle')} onClose={() => setKeeping(false)}>
        <div className="flex flex-col gap-2">
          {[
            { label: t('nudges.keepOccasion'), hint: t('nudges.keepOccasionHint'), icon: <Sparkles size={18} />, run: () => keepAs('occasion') },
            { label: t('nudges.keepSentimental'), hint: t('nudges.keepSentimentalHint'), icon: <Heart size={18} />, run: () => keepAs('sentimental') },
            { label: t('nudges.keepOther'), hint: t('nudges.keepOtherHint'), icon: <Gift size={18} />, run: keepOther },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => void o.run()}
              className="flex items-center gap-4 rounded-[20px] bg-card p-4 text-left shadow-soft hover:shadow-lift"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand" aria-hidden="true">
                {o.icon}
              </span>
              <span>
                <span className="block font-semibold">{o.label}</span>
                <span className="block text-[13.5px] text-muted">{o.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </Sheet>

      <ConfirmDialog
        open={donating}
        title={t('nudges.donateTitle', { name: item.name })}
        confirmLabel={t('nudges.donateConfirm')}
        onConfirm={() => void donate()}
        onCancel={() => setDonating(false)}
      >
        {t('nudges.donateBody')}
      </ConfirmDialog>
    </section>
  )
}
