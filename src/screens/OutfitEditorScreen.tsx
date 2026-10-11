import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Search, Trash2, X } from 'lucide-react'
import type { Item, Outfit } from '../domain/types'
import { deleteOutfit, restoreOutfit, saveOutfit, updateOutfit, useItems, useOutfit, useOutfits, useWears } from '../data'
import { normalizeSearch } from '../domain/catalogue'
import { homeGrid } from '../domain/logging'
import { buildWearIndex } from '../domain/wearStats'
import { t } from '../i18n'
import { Button } from '../ui/Button'
import { Field, TextInput } from '../ui/fields'
import { LogTile } from '../ui/LogTile'
import { TopBar, useBack } from '../ui/TopBar'
import { useToast } from '../ui/Toast'

/** /outfits/new and /outfits/:id */
export function OutfitEditorScreen() {
  const { id } = useParams()
  const isNew = !id
  const outfit = useOutfit(id)
  const outfits = useOutfits()
  const items = useItems()
  const back = useBack('/outfits')
  if (items === undefined || outfits === undefined || (!isNew && outfit === undefined)) return null
  if (!isNew && outfit === null) {
    return (
      <>
        <TopBar onBack={back} />
        <p className="mx-auto max-w-lg px-4 py-12 text-center text-muted">{t('outfits.notFound')}</p>
      </>
    )
  }
  return <Editor key={id ?? 'new'} outfit={outfit ?? undefined} items={items} count={outfits.length} />
}

function Editor({ outfit, items, count }: { outfit?: Outfit; items: Item[]; count: number }) {
  const [name, setName] = useState(outfit?.name ?? t('outfits.defaultName', { n: count + 1 }))
  const [picked, setPicked] = useState<Set<string>>(() => new Set(outfit?.itemIds ?? []))
  const [query, setQuery] = useState('')
  const wears = useWears()
  const back = useBack('/outfits')
  const navigate = useNavigate()
  const toast = useToast()

  const ordered = useMemo(() => homeGrid(items, buildWearIndex(wears ?? [], items), picked, Infinity).shown, [items, wears, picked])
  const shown = query.trim() ? ordered.filter((i) => normalizeSearch(i.name).includes(normalizeSearch(query))) : ordered
  const valid = picked.size >= 2 && name.trim().length > 0

  const toggle = (itemId: string) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })

  const save = async () => {
    if (!valid) return
    // keep the pieces in the order shown, which is the order they are logged in
    const itemIds = ordered.filter((i) => picked.has(i.id)).map((i) => i.id)
    if (outfit) await updateOutfit(outfit.id, { name: name.trim(), itemIds })
    else await saveOutfit(name, itemIds)
    toast(t('outfits.saved'))
    back()
  }

  const remove = async () => {
    if (!outfit) return
    await deleteOutfit(outfit.id)
    navigate('/outfits', { replace: true })
    toast(t('outfits.deleted', { name: outfit.name }), { label: t('common.undo'), onClick: () => void restoreOutfit(outfit.id) })
  }

  return (
    <>
      <TopBar
        title={outfit ? t('outfits.editTitle') : t('outfits.newTitle')}
        onBack={back}
        backLabel={t('common.cancel')}
        backIcon={<X size={24} aria-hidden="true" />}
        actions={
          outfit && (
            <button
              type="button"
              onClick={remove}
              aria-label={t('outfits.delete')}
              className="flex h-12 w-12 items-center justify-center rounded-full text-ink/70 hover:bg-sand"
            >
              <Trash2 size={20} aria-hidden="true" />
            </button>
          )
        }
      />
      <form
        className="mx-auto flex max-w-lg flex-col gap-6 px-4 pt-2 pb-32"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <Field label={t('outfits.name')}>
          {(p) => <TextInput {...p} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('outfits.namePlaceholder')} />}
        </Field>

        <fieldset>
          <legend className="font-semibold">
            {t('outfits.pieces')}
            <span className="ml-2 font-normal text-muted" aria-live="polite">
              {t('outfits.selected', { count: picked.size })}
            </span>
          </legend>
          <p className="mb-3 text-[13.5px] text-muted">{t('outfits.piecesHint')}</p>
          <div className="relative mb-4">
            <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink/45" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('today.findPiece')}
              aria-label={t('today.findPiece')}
              className="min-h-12 w-full rounded-full border-[1.5px] border-ink/35 bg-card pr-4 pl-11 text-[16px] placeholder:text-ink/60 focus:border-mak focus:outline-none"
            />
          </div>
          <ul className="grid grid-cols-3 gap-x-3 gap-y-4">
            {shown.map((item) => (
              <li key={item.id}>
                <LogTile item={item} selected={picked.has(item.id)} onToggle={() => toggle(item.id)} />
              </li>
            ))}
          </ul>
        </fieldset>

        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-thread bg-paper/95 pb-safe backdrop-blur-sm">
          <div className="mx-auto max-w-lg px-4 py-3">
            <Button type="submit" block disabled={!valid}>
              {t('outfits.save')}
            </Button>
          </div>
        </div>
      </form>
    </>
  )
}
