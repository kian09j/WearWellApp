import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

interface ToastAction {
  label: string
  onClick: () => void
}

interface ToastState {
  id: number
  message: string
  action?: ToastAction
}

type ShowToast = (message: string, action?: ToastAction) => void

const ToastContext = createContext<ShowToast>(() => {})

export function useToast(): ShowToast {
  return useContext(ToastContext)
}

/** One toast at a time, above the tab bar. Announced politely to screen readers. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const show = useCallback<ShowToast>((message, action) => {
    setToast({ id: Date.now(), message, action })
  }, [])

  useEffect(() => {
    if (!toast) return
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), toast.action ? 6000 : 3500)
    return () => clearTimeout(timer.current)
  }, [toast])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-30 flex justify-center px-4 pb-safe">
        {toast && (
          <div
            key={toast.id}
            className="pointer-events-auto flex min-h-12 max-w-md items-center gap-3 rounded-full bg-ink py-2 pr-2 pl-5 text-[15px] text-card shadow-lift animate-toast"
          >
            <span className="py-1">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action!.onClick()
                  setToast(null)
                }}
                className="min-h-10 rounded-full px-4 font-semibold text-slonecznik hover:bg-card/10"
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}
