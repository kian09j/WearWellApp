import { useMemo } from 'react'
import { useItems, useWears } from '../data'
import { colourDef } from '../domain/colours'
import { formatMoney, t } from '../i18n'
import { Flower } from '../ui/Flower'
import { Screen } from '../ui/Screen'

// Step 1 preview: a plain list proving the data layer works. Replaced by the catalogue in step 2.
export function WardrobeScreen() {
  const items = useItems()
  const wears = useWears()

  const wearCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const w of wears ?? []) counts.set(w.itemId, (counts.get(w.itemId) ?? 0) + 1)
    return counts
  }, [wears])

  const sorted = useMemo(
    () => [...(items ?? [])].sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name)),
    [items],
  )

  return (
    <Screen title={t('wardrobe.title')}>
      {items === undefined ? null : sorted.length === 0 ? (
        <section className="card-soft flex flex-col items-center px-6 py-10 text-center">
          <Flower size={64} petal="var(--color-chaber)" inner="var(--color-card)" />
          <h2 className="mt-5 text-[1.6rem]">{t('wardrobe.emptyTitle')}</h2>
          <p className="mt-2 max-w-xs text-muted">{t('wardrobe.emptyBody')}</p>
        </section>
      ) : (
        <>
          <p className="mb-4 text-[14px] text-muted">{t('wardrobe.previewNote')}</p>
          <ul className="card-soft divide-y divide-thread overflow-hidden">
            {sorted.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-5 py-3.5">
                <span
                  className="h-7 w-7 shrink-0 rounded-full ring-1 ring-ink/15"
                  style={{ background: item.colour ? colourDef(item.colour).hex : 'var(--color-sand)' }}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{item.name}</p>
                  <p className="truncate text-[13.5px] text-muted">
                    {t(`categories.${item.category}`)} · {item.price ? formatMoney(item.price) : t('common.noPrice')} ·{' '}
                    {t(`statuses.${item.status}`)}
                  </p>
                </div>
                <div className="shrink-0 text-right text-[13.5px]">
                  {item.kind === 'wishlist' ? (
                    <span className="hang-tag">{t('wardrobe.wishlistBadge')}</span>
                  ) : (
                    <span className="tabular-nums">{t('common.wears', { count: wearCounts.get(item.id) ?? 0 })}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Screen>
  )
}
