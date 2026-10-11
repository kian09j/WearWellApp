import { NavLink, Outlet } from 'react-router'
import { ChartColumn, Shirt, ShoppingBag, Sun } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { t, type TKey } from '../i18n'

const TABS: { to: string; label: TKey; icon: LucideIcon }[] = [
  { to: '/', label: 'nav.today', icon: Sun },
  { to: '/wardrobe', label: 'nav.wardrobe', icon: Shirt },
  { to: '/before-you-buy', label: 'nav.beforeYouBuy', icon: ShoppingBag },
  { to: '/stats', label: 'nav.stats', icon: ChartColumn },
]

export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col pt-safe">
      <main className="flex-1 pb-24">
        <Outlet />
      </main>
      <nav
        aria-label={t('nav.main')}
        className="fixed inset-x-0 bottom-0 z-20 border-t border-thread bg-card/95 pb-safe backdrop-blur-sm"
      >
        <ul className="mx-auto flex max-w-lg">
          {TABS.map(({ to, label, icon: Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[12px] font-semibold transition-colors ${
                    isActive ? 'text-mak' : 'text-muted hover:text-ink'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={24} strokeWidth={isActive ? 2.4 : 1.9} aria-hidden="true" />
                    <span className="text-center leading-tight">{t(label)}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
