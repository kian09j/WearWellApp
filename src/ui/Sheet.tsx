import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { t } from '../i18n'

interface SheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

/** Bottom sheet on a native modal <dialog>: Escape and the backdrop close it. */
export function Sheet({ open, title, onClose, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="mx-auto mt-auto mb-0 max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-paper p-0 text-ink shadow-lift"
    >
      {open && (
        <div className="px-5 pt-3 pb-safe">
          <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-ink/15" aria-hidden="true" />
          <div className="flex items-center justify-between gap-3">
            <h2 id={titleId} className="text-[1.6rem]">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="-mr-2 flex h-12 w-12 items-center justify-center rounded-full hover:bg-sand"
            >
              <X size={22} aria-hidden="true" />
            </button>
          </div>
          <div className="pt-2 pb-5">{children}</div>
        </div>
      )}
    </dialog>
  )
}
