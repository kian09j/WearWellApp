import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Minus, Plus } from 'lucide-react'
import type { CategoryId } from '../domain/types'
import { addItems, updateSettings, useItems, type NewItem } from '../data'
import { CATEGORIES } from '../domain/categories'
import { placeholderNames } from '../domain/catalogue'
import { t } from '../i18n'
import { Button } from '../ui/Button'
import { CategoryIcon } from '../ui/CategoryIcon'
import { TopBar, useBack } from '../ui/TopBar'
import { useToast } from '../ui/Toast'

const MAX = 99

/** Plus / minus per category. Creates placeholder pieces in under a minute; details can come later. */
export function QuickCountScreen() {
  const [counts, setCounts] = useState<Partial<Record<CategoryId, number>>>({})
  const [saving, setSaving] = useState(false)
  const items = useItems()
  const back = useBack('/welcome')
  const navigate = useNavigate()
  const toast = useToast()

  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0)
  const change = (c: CategoryId, delta: number) =>
    setCounts((prev) => ({ ...prev, [c]: Math.min(MAX, Math.max(0, (prev[c] ?? 0) + delta)) }))

  const create = async () => {
    setSaving(true)
    const owned = (items ?? []).filter((i) => i.kind === 'owned')
    const toAdd: NewItem[] = CATEGORIES.flatMap(({ id }) => {
      const n = counts[id] ?? 0
      const existing = owned.filter((i) => i.category === id).length
      return placeholderNames(t(`categorySingular.${id}`), n, existing).map((name) => ({ name, category: id, placeholder: true }))
    })
    await addItems(toAdd)
    await updateSettings({ onboarded: true })
    toast(t('quickCount.added', { count: toAdd.length }))
    navigate('/wardrobe', { replace: true })
  }

  const skip = async () => {
    await updateSettings({ onboarded: true })
    navigate('/wardrobe', { replace: true })
  }

  return (
    <>
      <TopBar
        onBack={back}
        actions={
          <button type="button" onClick={skip} className="min-h-11 rounded-full px-4 text-[15px] font-semibold text-muted hover:bg-sand">
            {t('common.skip')}
          </button>
        }
      />
      <div className="mx-auto max-w-lg px-4 pb-32">
        <h1 className="text-[2.2rem] leading-tight">{t('quickCount.title')}</h1>
        <p className="mt-2 text-muted">{t('quickCount.intro')}</p>

        <ul className="card-soft mt-6 divide-y divide-thread px-4">
          {CATEGORIES.map(({ id }) => {
            const n = counts[id] ?? 0
            const label = t(`categories.${id}`)
            return (
              <li key={id} className="flex items-center gap-3 py-2.5">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${n > 0 ? 'bg-tint-mieta text-koniczyna' : 'bg-sand text-ink/60'}`}
                >
                  <CategoryIcon category={id} size={24} />
                </span>
                <span className="min-w-0 flex-1 text-[15.5px] leading-tight font-semibold">{label}</span>
                <button
                  type="button"
                  onClick={() => change(id, -1)}
                  disabled={n === 0}
                  aria-label={t('quickCount.fewer', { category: label })}
                  className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-ink/15 text-ink disabled:opacity-30"
                >
                  <Minus size={18} aria-hidden="true" />
                </button>
                <span className="w-8 text-center font-display text-[1.45rem] lining-nums tabular-nums" aria-live="polite" aria-atomic="true">
                  <span className="sr-only">{label}: </span>
                  {n}
                </span>
                <button
                  type="button"
                  onClick={() => change(id, 1)}
                  disabled={n >= MAX}
                  aria-label={t('quickCount.more', { category: label })}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-card active:scale-95 disabled:opacity-30"
                >
                  <Plus size={18} strokeWidth={2.4} aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-thread bg-paper/95 pb-safe backdrop-blur-sm">
        <div className="mx-auto max-w-lg px-4 py-3">
          <Button block disabled={total === 0 || saving} onClick={create}>
            {total === 0 ? t('quickCount.nothingYet') : t('quickCount.add', { count: total })}
          </Button>
        </div>
      </div>
    </>
  )
}
