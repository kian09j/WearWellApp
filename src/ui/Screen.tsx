import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Settings } from 'lucide-react'
import { t } from '../i18n'

interface ScreenProps {
  title: ReactNode
  eyebrow?: ReactNode
  children: ReactNode
  /** Hide the settings shortcut (on the settings screen itself). */
  noSettings?: boolean
}

export function Screen({ title, eyebrow, children, noSettings }: ScreenProps) {
  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-8">
      <header className="flex items-start justify-between gap-3 pt-6 pb-5">
        <div className="min-w-0">
          {eyebrow && <p className="label-caps mb-1">{eyebrow}</p>}
          <h1 className="text-[2.1rem] leading-[1.05] text-ink">{title}</h1>
        </div>
        {!noSettings && (
          <Link
            to="/settings"
            aria-label={t('nav.settings')}
            className="-mr-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-ink/70 hover:bg-sand hover:text-ink"
          >
            <Settings size={22} aria-hidden="true" />
          </Link>
        )}
      </header>
      {children}
    </div>
  )
}
