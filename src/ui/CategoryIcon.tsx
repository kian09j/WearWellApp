import type { CategoryId } from '../domain/types'

// Hand-drawn line icons, one per category, in the same weight as the Lucide icons used
// elsewhere. They stand in for a photo, so a wardrobe without photos still looks cared for.

const PATHS: Record<CategoryId, string[]> = {
  tshirts: ['M8 3 4 5.5 2.5 9.5l3 1L6 9v12h12V9l.5 1.5 3-1L20 5.5 16 3c-.5 1.5-2 2.5-4 2.5S8.5 4.5 8 3Z'],
  shirts: ['M8 3 4 5 2.5 11l3 .5L6 10v11h12V10l.5 1.5 3-.5L20 5l-4-2', 'M8 3l4 5 4-5', 'M12 8v13', 'M8 3h8'],
  knitwear: [
    'M8.5 3 4.5 5 2.5 18h3l1-8v10h11V10l1 8h3L19.5 5l-4-2c-.5 1.5-1.8 2.3-3.5 2.3S9 4.5 8.5 3Z',
    'M6.5 17.5h11',
  ],
  sweatshirts: [
    'M8.5 3 4.5 5 2.5 18h3l1-8v10h11V10l1 8h3L19.5 5l-4-2',
    'M8.5 3c0 3 1.5 4.5 3.5 4.5s3.5-1.5 3.5-4.5',
    'M9.5 14h5l-.7 3h-3.6Z',
  ],
  dresses: ['M9 2.5V5L7 9 4.5 21h15L17 9l-2-4V2.5', 'M7 9h10'],
  skirts: ['M7 4h10l3 16H4Z', 'M7 6.5h10', 'M10 6.5 9 20', 'M14 6.5l1 13.5'],
  trousers: ['M6.5 3h11L19 21h-5L12 9l-2 12H5Z', 'M6.5 5.5h11'],
  jeans: ['M6.5 3h11L19 21h-5L12 9l-2 12H5Z', 'M6.5 5.5h11', 'M7.2 5.5c.3 2 1.5 2.7 2.8 2.7', 'M16.8 5.5c-.3 2-1.5 2.7-2.8 2.7'],
  shorts: ['M5.5 5h13L20 17h-6l-2-6-2 6H4Z', 'M5.5 7.5h13'],
  jackets: ['M8.5 3 4.5 5 3 17h3l.5-6v7h11v-7l.5 6h3L19.5 5l-4-2', 'M8.5 3 12 6l3.5-3', 'M12 6v12'],
  coats: [
    'M8.5 2.5 4.5 4.5 3 16h3l.5-6v11.5h11V10l.5 6h3L19.5 4.5l-4-2',
    'M8.5 2.5 11 8l1 13.5',
    'M15.5 2.5 13 8',
    'M14.5 12h.01',
    'M14.5 16h.01',
  ],
  blazers: ['M8.5 3 4.5 5 3 18h3l.5-7v8h11v-8l.5 7h3L19.5 5l-4-2', 'M8.5 3l2 6 1.5 4 1.5-4 2-6', 'M12 16h.01'],
  activewear: ['M8.5 3c0 2.5-2.5 4-2.5 6.5V21h12V9.5C18 7 15.5 5.5 15.5 3', 'M8.5 3c.5 2.5 1.8 3.8 3.5 3.8s3-1.3 3.5-3.8', 'M6 14l12-3'],
  shoes: ['M3 17.5V11l4-2 2.5 2c1.5 1 4.5 1.7 6.5 2l4 1c1 .3 1.5 1 1.5 2v1.5Z', 'M3 15.5h18.5', 'M8 10.5l1-1', 'M10.2 11.8l1-1'],
  bags: ['M5 9h14l-1 11H6Z', 'M9 9V7a3 3 0 0 1 6 0v2'],
  accessories: [
    'M4 13a3 3 0 1 0 6 0 3 3 0 1 0-6 0',
    'M14 13a3 3 0 1 0 6 0 3 3 0 1 0-6 0',
    'M10 12.5c1-.7 3-.7 4 0',
    'M4.2 12 2.5 9',
    'M19.8 12l1.7-3',
  ],
  other: ['M12 7c0-1.5 1-2 1.5-2.5.7-.7.5-2-.7-2.3-1-.2-1.8.4-1.8 1.3', 'M12 7l-9 6.5c-.7.5-.4 1.5.4 1.5h17.2c.8 0 1.1-1 .4-1.5Z'],
}

interface CategoryIconProps {
  category: CategoryId
  size?: number
  strokeWidth?: number
  className?: string
}

export function CategoryIcon({ category, size = 24, strokeWidth = 1.7, className }: CategoryIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[category].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
