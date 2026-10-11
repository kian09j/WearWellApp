// Paper-cut (wycinanka) ornaments shared with polskapicks.com. Decorative only.

interface FlowerProps {
  size?: number | string
  petal?: string
  inner?: string
  center?: string
  className?: string
}

/** Łowicz-style rosette: the WearWell mark. */
export function Flower({
  size = 48,
  petal = 'var(--color-mak)',
  inner = 'var(--color-roz)',
  center = 'var(--color-slonecznik)',
  className,
}: FlowerProps) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <ellipse key={i} cx="50" cy="23" rx="11.5" ry="22" fill={petal} transform={`rotate(${i * 45} 50 50)`} />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <ellipse key={`i${i}`} cx="50" cy="34" rx="5" ry="9" fill={inner} transform={`rotate(${i * 45 + 22.5} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="12" fill={center} />
      <circle cx="50" cy="50" r="4.5" fill={petal} />
    </svg>
  )
}

/** wear [rosette] well, in the same style as the polska [poppy] picks wordmark. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="WearWell"
      className={`inline-flex items-center font-display tracking-[-0.03em] ${className}`}
      style={{ fontWeight: 500 }}
    >
      wear
      <Flower size="0.74em" className="mx-[0.08em]" />
      well
    </span>
  )
}
