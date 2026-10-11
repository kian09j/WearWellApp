import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import type { WearLog } from '../domain/types'
import { logWear, unlogWear } from '../data'
import { addDays, isDateKey } from '../domain/dates'
import { formatDate, t } from '../i18n'
import { Button } from '../ui/Button'
import { Field, TextInput } from '../ui/fields'
import { useToast } from '../ui/Toast'
import { useToday } from '../ui/useToday'

const VISIBLE = 6

/** A piece's wears, newest first, each removable, plus logging a wear for any past day. */
export function WearHistory({ itemId, wears, priorWears = 0 }: { itemId: string; wears: readonly WearLog[]; priorWears?: number }) {
  const today = useToday()
  const [showAll, setShowAll] = useState(false)
  const [date, setDate] = useState(() => addDays(today, -1))
  const toast = useToast()

  const dates = useMemo(
    () => wears.filter((w) => w.itemId === itemId).map((w) => w.date).sort((a, b) => b.localeCompare(a)),
    [wears, itemId],
  )
  const visible = showAll ? dates : dates.slice(0, VISIBLE)

  const remove = async (d: string) => {
    await unlogWear(itemId, d)
    toast(t('item.wearRemoved', { date: formatDate(d, 'dayMonth') }), { label: t('common.undo'), onClick: () => void logWear(itemId, d) })
  }

  const add = async () => {
    if (!isDateKey(date) || date > today) return
    if (dates.includes(date)) {
      toast(t('item.wearExists', { date: formatDate(date, 'dayMonth') }))
      return
    }
    await logWear(itemId, date)
    toast(t('item.wearAdded', { date: formatDate(date, 'dayMonth') }), { label: t('common.undo'), onClick: () => void unlogWear(itemId, date) })
  }

  return (
    <section className="mt-6">
      <h3 className="label-caps mb-2">{t('item.history')}</h3>
      <div className="card-soft px-5 py-2">
        {dates.length === 0 ? (
          <p className="py-3 text-[15px] text-muted">{t('item.historyEmpty')}</p>
        ) : (
          <ul className="divide-y divide-thread">
            {visible.map((d) => (
              <li key={d} className="flex min-h-12 items-center justify-between gap-3">
                <span className="text-[15px]">{formatDate(d, 'weekday')}</span>
                <button
                  type="button"
                  onClick={() => void remove(d)}
                  aria-label={t('item.removeWear', { date: formatDate(d, 'weekday') })}
                  className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-ink/60 hover:bg-sand hover:text-ink"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {priorWears > 0 && <p className="border-t border-thread py-3 text-[14px] text-muted">{t('item.priorWears', { count: priorWears })}</p>}
        {dates.length > VISIBLE && !showAll && (
          <button type="button" onClick={() => setShowAll(true)} className="min-h-11 w-full text-[14px] font-semibold text-mak">
            {t('item.historyMore', { count: dates.length - VISIBLE })}
          </button>
        )}
      </div>

      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void add()
        }}
      >
        <div className="flex-1">
          <Field label={t('item.addWear')}>
            {(p) => <TextInput {...p} type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />}
          </Field>
        </div>
        <Button type="submit" variant="ink" className="px-5">
          {t('item.logIt')}
        </Button>
      </form>
    </section>
  )
}
