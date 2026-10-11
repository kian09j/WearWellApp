import { useMemo, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { Heart, Pencil, Trash2 } from 'lucide-react'
import { deleteItem, restoreItem, updateItem, useItem, useWears } from '../data'
import { isAllYear } from '../domain/dates'
import { buildWearIndex, wearStat } from '../domain/wearStats'
import { formatDate, formatMoney, t } from '../i18n'
import { Button } from '../ui/Button'
import { ColourDot, ItemThumb } from '../ui/ItemThumb'
import { TopBar, useBack } from '../ui/TopBar'
import { useToast } from '../ui/Toast'

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-thread py-3 last:border-b-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-semibold">{children}</dd>
    </div>
  )
}

export function ItemDetailScreen() {
  const { id } = useParams()
  const item = useItem(id)
  const wears = useWears()
  const back = useBack()
  const toast = useToast()

  const stat = useMemo(() => (id ? wearStat(buildWearIndex(wears ?? []), id) : undefined), [wears, id])

  if (item === undefined) return null
  if (item === null) {
    return (
      <>
        <TopBar onBack={back} />
        <div className="mx-auto max-w-lg px-4 py-12 text-center">
          <p className="text-muted">{t('item.notFound')}</p>
          <Link to="/wardrobe" className="mt-4 inline-block font-semibold text-mak underline underline-offset-4">
            {t('item.backToWardrobe')}
          </Link>
        </div>
      </>
    )
  }

  const remove = async () => {
    await deleteItem(item.id)
    back()
    toast(t('item.deleted', { name: item.name }), { label: t('common.undo'), onClick: () => void restoreItem(item.id) })
  }

  const seasons = isAllYear(item.seasons) ? t('seasons.allYear') : item.seasons.map((s) => t(`seasons.${s}`)).join(', ')

  return (
    <>
      <TopBar
        onBack={back}
        actions={
          <>
            <button
              type="button"
              aria-pressed={item.favourite}
              aria-label={item.favourite ? t('item.removeFromFavourites') : t('item.addToFavourites')}
              onClick={() => void updateItem(item.id, { favourite: !item.favourite })}
              className={`flex h-12 w-12 items-center justify-center rounded-full hover:bg-sand ${item.favourite ? 'text-mak' : 'text-ink/70'}`}
            >
              <Heart size={22} fill={item.favourite ? 'currentColor' : 'none'} aria-hidden="true" />
            </button>
            <Link
              to={`/item/${item.id}/edit`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-ink px-4 text-[14px] font-semibold text-card hover:bg-ink/85"
            >
              <Pencil size={15} aria-hidden="true" />
              {t('common.edit')}
            </Link>
          </>
        }
      />

      <div className="mx-auto max-w-lg px-4 pb-10">
        <div className="mx-auto aspect-[4/5] max-h-[52dvh] overflow-hidden rounded-[28px] bg-sand shadow-soft">
          <ItemThumb item={item} fit="contain" iconSize={96} />
        </div>

        <h2 className="mt-5 text-[2rem] leading-[1.08]">{item.name}</h2>
        <p className="mt-1 flex items-center gap-2 text-muted">
          {t(`categories.${item.category}`)}
          {item.colour && (
            <>
              <span aria-hidden="true">·</span>
              <ColourDot item={item} size={12} />
              {t(`colours.${item.colour}`)}
            </>
          )}
        </p>

        {item.placeholder && (
          <div className="mt-5 rounded-[22px] bg-tint-maslo p-5">
            <p className="text-[15px] text-ink/85">{t('item.placeholderHint')}</p>
            <Link
              to={`/item/${item.id}/edit`}
              className="mt-3 inline-flex min-h-11 items-center rounded-full bg-card px-5 text-[14px] font-semibold shadow-sm"
            >
              {t('item.addDetails')}
            </Link>
          </div>
        )}

        <p className="mt-5 rounded-[22px] bg-tint-mieta px-5 py-4 text-[15px]">
          <span className="font-semibold">
            {stat && stat.count > 0 ? t('item.wornCount', { count: stat.count }) : t('item.neverWorn')}
          </span>
          {stat?.last && <span className="text-ink/75">, {t('item.lastWorn', { date: formatDate(stat.last, 'dayMonth') })}</span>}
        </p>

        <dl className="card-soft mt-5 px-5 py-1 text-[15px]">
          <Fact label={t('item.price')}>
            {item.price ? (
              formatMoney(item.price)
            ) : (
              <Link to={`/item/${item.id}/edit`} className="text-mak underline underline-offset-4">
                {t('item.addPrice')}
              </Link>
            )}
          </Fact>
          {item.purchaseDate && <Fact label={t('item.bought')}>{formatDate(item.purchaseDate)}</Fact>}
          {item.brand && <Fact label={t('item.brand')}>{item.brand}</Fact>}
          {item.size && <Fact label={t('item.size')}>{item.size}</Fact>}
          {item.condition && <Fact label={t('item.condition')}>{t(`conditions.${item.condition}`)}</Fact>}
          <Fact label={t('item.seasons')}>{seasons}</Fact>
          <Fact label={t('item.status')}>{t(`statuses.${item.status}`)}</Fact>
        </dl>

        {item.notes && (
          <section className="mt-5">
            <h3 className="label-caps mb-2">{t('item.notes')}</h3>
            <p className="whitespace-pre-line text-[15px] leading-relaxed">{item.notes}</p>
          </section>
        )}

        <Button variant="quiet" className="mt-8 text-muted" icon={<Trash2 size={17} aria-hidden="true" />} onClick={remove}>
          {t('item.delete')}
        </Button>
      </div>
    </>
  )
}
