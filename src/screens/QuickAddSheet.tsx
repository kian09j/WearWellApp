import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { CategoryId } from '../domain/types'
import { addItem } from '../data'
import { t } from '../i18n'
import { Button } from '../ui/Button'
import { Field, TextInput } from '../ui/fields'
import { CategoryPicker } from '../ui/pickers'
import { Sheet } from '../ui/Sheet'
import { useToast } from '../ui/Toast'

/** The fastest way in: a category is enough, the name is optional. */
export function QuickAddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<CategoryId>()
  const toast = useToast()
  const navigate = useNavigate()

  const close = () => {
    setName('')
    setCategory(undefined)
    onClose()
  }

  const save = async (thenEdit: boolean) => {
    if (!category) return
    const finalName = name.trim() || t(`categorySingular.${category}`)
    const id = await addItem({ name: finalName, category, placeholder: !name.trim() })
    close()
    if (thenEdit) navigate(`/item/${id}/edit`)
    else toast(t('quickAdd.added', { name: finalName }))
  }

  return (
    <Sheet open={open} title={t('quickAdd.title')} onClose={close}>
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          void save(false)
        }}
      >
        <Field label={t('quickAdd.name')} hint={t('quickAdd.nameHint')}>
          {(p) => (
            <TextInput
              {...p}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('quickAdd.namePlaceholder')}
              autoComplete="off"
              enterKeyHint="done"
            />
          )}
        </Field>
        <CategoryPicker label={t('quickAdd.category')} value={category} onChange={setCategory} />
        <div className="sticky bottom-0 -mx-5 flex flex-col gap-2 bg-paper px-5 pt-2 pb-1">
          <Button type="submit" block disabled={!category}>
            {t('quickAdd.save')}
          </Button>
          <Button variant="quiet" block disabled={!category} onClick={() => void save(true)}>
            {t('quickAdd.moreDetails')}
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
