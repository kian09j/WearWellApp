import type { ComponentPropsWithRef, ReactNode } from 'react'

type Variant = 'primary' | 'ghost' | 'quiet' | 'ink'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-mak text-card shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_10px_22px_-12px_rgb(199_62_34/0.9)] hover:bg-mak-strong',
  ghost: 'bg-card text-ink border-[1.5px] border-ink/15 hover:border-ink/45',
  quiet: 'bg-transparent text-ink hover:bg-sand',
  ink: 'bg-ink text-card hover:bg-ink/85',
}

interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: Variant
  icon?: ReactNode
  block?: boolean
}

export function Button({ variant = 'primary', icon, block, className = '', children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}
