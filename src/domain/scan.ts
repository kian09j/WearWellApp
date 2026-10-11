import type { CategoryId, ColourId } from './types'
import { CATEGORY_IDS, isCategoryId } from './categories'
import { COLOUR_IDS, isColourId } from './colours'

// The wardrobe photo scan: what the server asks Claude for, and how both the server and the
// app check the answer before anything reaches the review screen. Shared by api/ and src/.

/** Long edge of the photo sent for scanning: enough to tell folded pieces apart, cheap to send. */
export const SCAN_MAX_PX = 1600
/** The server refuses anything bigger than this (base64 characters, about 4.5 MB of image). */
export const SCAN_MAX_BASE64 = 6_000_000
export const SCAN_MEDIA_TYPES = ['image/jpeg', 'image/webp', 'image/png'] as const
export type ScanMediaType = (typeof SCAN_MEDIA_TYPES)[number]
/** More rows than this means the answer went wrong, not a very full shelf. */
export const SCAN_MAX_ITEMS = 60

export type Confidence = 'high' | 'medium' | 'low'

export interface ScanItem {
  category: CategoryId
  colour: ColourId | null
  /** A few words, usable as the piece's name ("Navy striped shirt"). */
  description: string
  confidence: Confidence
}

export interface ScanResult {
  items: ScanItem[]
  /** A short note for the person, e.g. that a folded stack was hard to count. May be empty. */
  notes: string
}

/** JSON Schema for structured output: every answer has exactly this shape. */
export const SCAN_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items', 'notes'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['category', 'colour', 'description', 'confidence'],
        properties: {
          category: { type: 'string', enum: [...CATEGORY_IDS] },
          colour: { anyOf: [{ type: 'string', enum: [...COLOUR_IDS] }, { type: 'null' }] },
          description: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    },
    notes: { type: 'string' },
  },
} as const

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const CONFIDENCE: readonly Confidence[] = ['high', 'medium', 'low']

function clean(text: string, max: number): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, max)
}

/**
 * Check an answer before using it. Rows that don't fit the shape are dropped rather than
 * failing the whole scan; anything that isn't a scan result at all returns null.
 */
export function validateScanResult(value: unknown): ScanResult | null {
  if (!isObj(value) || !Array.isArray(value.items)) return null
  const items: ScanItem[] = []
  for (const raw of value.items.slice(0, SCAN_MAX_ITEMS)) {
    if (!isObj(raw)) continue
    const { category, colour, description, confidence } = raw
    if (!isCategoryId(category)) continue
    if (typeof description !== 'string') continue
    items.push({
      category,
      colour: isColourId(colour) ? colour : null,
      description: clean(description, 60),
      confidence: CONFIDENCE.includes(confidence as Confidence) ? (confidence as Confidence) : 'low',
    })
  }
  return { items, notes: typeof value.notes === 'string' ? clean(value.notes, 300) : '' }
}

/** The piece name for a row: the description, capitalised, or the category's own name. */
export function scanItemName(item: Pick<ScanItem, 'description' | 'category'>, nameForCategory: (c: CategoryId) => string): string {
  const d = item.description.trim()
  return d ? d.charAt(0).toLocaleUpperCase() + d.slice(1) : nameForCategory(item.category)
}
