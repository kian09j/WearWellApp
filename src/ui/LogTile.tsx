import { Check } from 'lucide-react'
import type { Item } from '../domain/types'
import { ItemThumb } from './ItemThumb'

interface LogTileProps {
  item: Item
  selected: boolean
  onToggle: () => void
}

/** A square piece you tap to mark as worn (Today) or picked (outfit editor). A toggle button. */
export function LogTile({ item, selected, onToggle }: LogTileProps) {
  return (
    <button type="button" aria-pressed={selected} onClick={onToggle} className="group block w-full rounded-[20px] text-left">
      <span
        className={`relative block aspect-square overflow-hidden rounded-[20px] bg-card shadow-soft transition-[box-shadow,transform] duration-150 group-active:scale-[0.96] ${
          selected ? 'ring-[3px] ring-koniczyna ring-offset-2 ring-offset-paper' : ''
        }`}
      >
        <ItemThumb item={item} iconSize={34} />
        {selected && (
          <>
            <span className="absolute inset-0 bg-koniczyna/12" aria-hidden="true" />
            <span className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-koniczyna text-card animate-pop" aria-hidden="true">
              <Check size={16} strokeWidth={3} />
            </span>
          </>
        )}
      </span>
      <span className={`mt-1.5 block truncate px-0.5 text-[13px] leading-tight font-semibold ${selected ? 'text-koniczyna-ink' : 'text-ink/85'}`}>
        {item.name}
      </span>
    </button>
  )
}
