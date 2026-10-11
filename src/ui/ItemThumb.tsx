import { Heart } from 'lucide-react'
import { Link } from 'react-router'
import type { Item } from '../domain/types'
import { colourDef } from '../domain/colours'
import { usePhotoUrl } from '../data'
import { t } from '../i18n'
import { CategoryIcon } from './CategoryIcon'

/** Tinted background for photo-less pieces: a soft wash of the piece's colour. */
export function colourWash(item: Pick<Item, 'colour'>): string {
  const hex = item.colour ? colourDef(item.colour).hex : undefined
  return hex && hex.startsWith('#') ? `color-mix(in srgb, ${hex} 20%, var(--color-card))` : 'var(--color-sand)'
}

export function ColourDot({ item, size = 14, className = '' }: { item: Pick<Item, 'colour'>; size?: number; className?: string }) {
  if (!item.colour) return null
  return (
    <span
      className={`inline-block shrink-0 rounded-full ring-1 ring-ink/20 ${className}`}
      style={{ width: size, height: size, background: colourDef(item.colour).hex }}
      aria-hidden="true"
    />
  )
}

interface ItemThumbProps {
  item: Item
  iconSize?: number
  /** cover fills a tile; contain shows the whole photo (detail screen). */
  fit?: 'cover' | 'contain'
}

/** The piece's photo, or its category icon on a wash of its colour when there is none. */
export function ItemThumb({ item, iconSize = 44, fit = 'cover' }: ItemThumbProps) {
  const url = usePhotoUrl(item.photoId)
  if (url) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        className={`h-full w-full ${fit === 'cover' ? 'object-cover' : 'object-contain'}`}
      />
    )
  }
  return (
    <div className="relative flex h-full w-full items-center justify-center text-ink/55" style={{ background: colourWash(item) }}>
      <CategoryIcon category={item.category} size={iconSize} strokeWidth={1.4} />
    </div>
  )
}

export function ItemTile({ item, wears }: { item: Item; wears: number }) {
  const wearText = wears > 0 ? t('wardrobe.tileWears', { count: wears }) : t('common.notWornYet')
  return (
    <Link to={`/item/${item.id}`} className="group block rounded-[22px]" aria-label={`${item.name}, ${wearText}`}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] bg-card shadow-soft transition-transform duration-150 group-active:scale-[0.98]">
        <ItemThumb item={item} />
        <ColourDot item={item} className="absolute top-3 right-3" />
        {item.favourite && (
          <span className="absolute top-2.5 left-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-card/90 text-mak">
            <Heart size={15} fill="currentColor" aria-hidden="true" />
          </span>
        )}
        {item.placeholder && <span className="hang-tag absolute bottom-2.5 left-2.5 !text-[11.5px]">{t('wardrobe.addDetails')}</span>}
      </div>
      <p className="mt-2 truncate px-0.5 text-[15px] font-semibold">{item.name}</p>
      <p className="truncate px-0.5 text-[13px] text-muted">{wearText}</p>
    </Link>
  )
}
