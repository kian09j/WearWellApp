import { useId } from 'react'
import { Check } from 'lucide-react'
import type { CategoryId, ColourId, Season } from '../domain/types'
import { CATEGORIES } from '../domain/categories'
import { COLOURS } from '../domain/colours'
import { isAllYear } from '../domain/dates'
import { t } from '../i18n'
import { CategoryIcon } from './CategoryIcon'

// Pickers are real radio buttons and checkboxes under the styling, so keyboards and
// screen readers get the right behaviour without extra work.

export function CategoryPicker({
  value,
  onChange,
  label,
}: {
  value: CategoryId | undefined
  onChange: (c: CategoryId) => void
  label: string
}) {
  const name = useId()
  return (
    <fieldset>
      <legend className="mb-2 font-semibold">{label}</legend>
      <div className="grid grid-cols-3 gap-2">
        {CATEGORIES.map(({ id }) => (
          <label key={id} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={id}
              checked={value === id}
              onChange={() => onChange(id)}
              className="peer sr-only"
            />
            <span className="flex min-h-[76px] flex-col items-center justify-center gap-1 rounded-2xl border-[1.5px] border-ink/10 bg-card px-1 py-2 text-center text-[12.5px] leading-tight font-semibold text-ink/80 transition-colors peer-checked:border-mak peer-checked:bg-mak-soft peer-checked:text-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-mak">
              <CategoryIcon category={id} size={26} />
              {t(`categories.${id}`)}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function ColourPicker({
  value,
  onChange,
  label,
}: {
  value: ColourId | undefined
  onChange: (c: ColourId | undefined) => void
  label: string
}) {
  const name = useId()
  const options: (ColourId | undefined)[] = [...COLOURS.map((c) => c.id), undefined]
  return (
    <fieldset>
      <legend className="mb-2 font-semibold">
        {label}
        <span className="ml-2 font-normal text-muted">{value ? t(`colours.${value}`) : t('colours.none')}</span>
      </legend>
      <div className="grid grid-cols-7 gap-2">
        {options.map((id) => {
          const def = COLOURS.find((c) => c.id === id)
          const checked = value === id
          return (
            <label key={id ?? 'none'} className="flex cursor-pointer justify-center">
              <input
                type="radio"
                name={name}
                checked={checked}
                onChange={() => onChange(id)}
                className="peer sr-only"
              />
              <span className="sr-only">{id ? t(`colours.${id}`) : t('colours.none')}</span>
              <span
                className="relative flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-ink/20 transition-shadow peer-checked:ring-[3px] peer-checked:ring-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-mak"
                style={{ background: def?.hex ?? 'var(--color-card)' }}
                aria-hidden="true"
              >
                {!id && <span className="h-[1.5px] w-6 rotate-45 bg-ink/40" />}
                {checked && id && (
                  <Check size={18} strokeWidth={3} className={['white', 'cream', 'beige', 'yellow', 'pink', 'lightblue'].includes(id) ? 'text-ink' : 'text-card'} />
                )}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']

export function SeasonPicker({
  value,
  onChange,
  label,
  hint,
}: {
  value: Season[]
  onChange: (s: Season[]) => void
  label: string
  hint?: string
}) {
  const allYear = isAllYear(value)
  const toggle = (s: Season) => {
    const current = allYear ? [] : value
    const next = current.includes(s) ? current.filter((x) => x !== s) : [...current, s]
    onChange(next.length === 4 ? [] : SEASONS.filter((x) => next.includes(x)))
  }
  const chip =
    'flex min-h-11 cursor-pointer items-center rounded-full border-[1.5px] border-ink/12 bg-card px-4 text-[14px] font-semibold text-ink/80 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-card peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-mak'
  return (
    <fieldset>
      <legend className="font-semibold">{label}</legend>
      {hint && <p className="mb-2 text-[13.5px] text-muted">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        <label>
          <input type="checkbox" checked={allYear} onChange={() => onChange([])} className="peer sr-only" />
          <span className={chip}>{t('seasons.allYear')}</span>
        </label>
        {SEASONS.map((s) => (
          <label key={s}>
            <input type="checkbox" checked={!allYear && value.includes(s)} onChange={() => toggle(s)} className="peer sr-only" />
            <span className={chip}>{t(`seasons.${s}`)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
