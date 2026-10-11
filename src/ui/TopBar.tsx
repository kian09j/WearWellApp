import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
import { t } from '../i18n'

/** Go back if there is somewhere to go back to, otherwise to a sensible screen (deep links). */
export function useBack(fallback = '/wardrobe') {
  const navigate = useNavigate()
  const location = useLocation()
  return () => (location.key !== 'default' ? navigate(-1) : navigate(fallback, { replace: true }))
}

interface TopBarProps {
  title?: string
  onBack: () => void
  backLabel?: string
  backIcon?: ReactNode
  actions?: ReactNode
}

export function TopBar({ title, onBack, backLabel = t('common.back'), backIcon, actions }: TopBarProps) {
  return (
    <div className="sticky top-0 z-10 bg-paper/90 pt-safe backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-lg items-center gap-1 px-2">
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full hover:bg-sand"
        >
          {backIcon ?? <ChevronLeft size={26} aria-hidden="true" />}
        </button>
        <h1 className="min-w-0 flex-1 truncate font-sans text-[16px] font-semibold tracking-normal">{title}</h1>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
    </div>
  )
}
