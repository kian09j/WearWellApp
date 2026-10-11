/** A slim progress bar; the text next to it says the same thing in words. */
export function ProgressBar({ ratio, label, className = '' }: { ratio: number; label: string; className?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, ratio)) * 100)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={`h-2 overflow-hidden rounded-full bg-ink/10 ${className}`}
    >
      <div className="h-full rounded-full bg-koniczyna transition-[width] duration-500" style={{ width: `${pct}%` }} />
    </div>
  )
}
