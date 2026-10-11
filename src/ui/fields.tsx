import { useId, type ComponentPropsWithRef, type ReactNode } from 'react'
import { t } from '../i18n'

export const inputClass =
  'min-h-12 w-full rounded-2xl border-[1.5px] border-ink/35 bg-card px-4 text-[16px] text-ink placeholder:text-ink/60 focus:border-mak focus:outline-none aria-[invalid=true]:border-mak'

interface FieldProps {
  label: string
  hint?: string
  error?: string
  optional?: boolean
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode
}

/** Label, hint and error wired to the control with ids, so screen readers read them together. */
export function Field({ label, hint, error, optional, children }: FieldProps) {
  const id = useId()
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-semibold">
        {label}
        {optional && <span className="ml-1.5 text-[13px] font-normal text-muted">({t('common.optional')})</span>}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-[13.5px] text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-[13.5px] font-semibold text-mak">
          {error}
        </p>
      )}
    </div>
  )
}

export function TextInput(props: ComponentPropsWithRef<'input'>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ''}`} />
}

export function Select(props: ComponentPropsWithRef<'select'>) {
  return <select {...props} className={`${inputClass} appearance-auto ${props.className ?? ''}`} />
}

export function TextArea(props: ComponentPropsWithRef<'textarea'>) {
  return <textarea {...props} className={`${inputClass} min-h-24 py-3 ${props.className ?? ''}`} />
}
