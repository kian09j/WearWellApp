import { Link } from 'react-router'
import { ChevronRight, Plus } from 'lucide-react'
import { useItems, useOutfits } from '../data'
import { t } from '../i18n'
import { ItemThumb } from '../ui/ItemThumb'
import { TopBar, useBack } from '../ui/TopBar'

export function OutfitsScreen() {
  const outfits = useOutfits()
  const items = useItems()
  const back = useBack('/')
  const byId = new Map((items ?? []).map((i) => [i.id, i]))

  return (
    <>
      <TopBar
        title={t('outfits.title')}
        onBack={back}
        actions={
          <Link
            to="/outfits/new"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-ink px-4 text-[14px] font-semibold text-card hover:bg-ink/85"
          >
            <Plus size={16} aria-hidden="true" />
            {t('outfits.newTitle')}
          </Link>
        }
      />
      <div className="mx-auto max-w-lg px-4 pb-10">
        <p className="mb-5 text-muted">{t('outfits.intro')}</p>
        {outfits && outfits.length === 0 && <p className="card-soft px-6 py-10 text-center text-muted">{t('outfits.empty')}</p>}
        <ul className="flex flex-col gap-3">
          {outfits?.map((o) => {
            const pieces = o.itemIds.map((id) => byId.get(id)).filter((i) => i !== undefined)
            return (
              <li key={o.id}>
                <Link to={`/outfits/${o.id}`} className="card-soft flex items-center gap-4 p-4 hover:shadow-lift">
                  <div className="flex -space-x-3" aria-hidden="true">
                    {pieces.slice(0, 4).map((item) => (
                      <span key={item.id} className="h-12 w-12 overflow-hidden rounded-full bg-card ring-2 ring-card">
                        <ItemThumb item={item} iconSize={22} />
                      </span>
                    ))}
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{o.name}</span>
                    <span className="block text-[13.5px] text-muted">{t('common.pieces', { count: pieces.length })}</span>
                  </span>
                  <ChevronRight size={20} className="text-ink/40" aria-hidden="true" />
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )
}
