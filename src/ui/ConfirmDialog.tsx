import { useEffect, useId, useRef, type ReactNode } from 'react'
import { t } from '../i18n'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/** Native <dialog>: focus trapping, Escape to close and screen reader semantics for free. */
export function ConfirmDialog({ open, title, children, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // start on the safe choice, so a stray Enter never confirms something irreversible
      cancelRef.current?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onCancel()
      }}
      aria-labelledby={titleId}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-[28px] bg-card p-6 text-ink shadow-lift"
    >
      <h2 id={titleId} className="text-[1.6rem] leading-tight">
        {title}
      </h2>
      <div className="mt-3 text-[15px] leading-relaxed text-muted">{children}</div>
      <div className="mt-6 flex flex-col gap-2">
        <Button variant="ink" block onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button ref={cancelRef} variant="quiet" block onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </dialog>
  )
}
