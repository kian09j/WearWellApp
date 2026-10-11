import { useId } from 'react'
import type { CategoryId } from '../domain/types'
import { CATEGORIES } from '../domain/categories'
import { t } from '../i18n'
import { CategoryIcon } from './CategoryIcon'

/** A compact, horizontally scrolling single choice of category (radio buttons underneath). */
export function CategoryChips({ value, onChange, label }: { value?: CategoryId; onChange: (c: CategoryId) => void; label: string }) {
  const name = useId()
  return (
    <fieldset>
      <legend className="mb-2 font-semibold">{label}</legend>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {CATEGORIES.map(({ id }) => (
          <label key={id} className="shrink-0 cursor-pointer">
            <input type="radio" name={name} checked={value === id} onChange={() => onChange(id)} className="peer sr-only" />
            <span className="flex min-h-11 items-center gap-1.5 rounded-full border-[1.5px] border-ink/12 bg-card px-3.5 text-[13.5px] font-semibold whitespace-nowrap text-ink/80 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-card peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-mak">
              <CategoryIcon category={id} size={18} />
              {t(`categories.${id}`)}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
