import type { ColourId } from './types'

export interface ColourDef {
  id: ColourId
  /** Swatch shown in pickers and placeholder tiles. */
  hex: string
}

export const COLOURS: readonly ColourDef[] = [
  { id: 'black', hex: '#1F1A17' },
  { id: 'white', hex: '#FFFFFF' },
  { id: 'cream', hex: '#F3E9D2' },
  { id: 'grey', hex: '#9A9692' },
  { id: 'navy', hex: '#24324F' },
  { id: 'blue', hex: '#4F72C9' },
  { id: 'lightblue', hex: '#A9C4E8' },
  { id: 'green', hex: '#3E7A4F' },
  { id: 'khaki', hex: '#8A8456' },
  { id: 'beige', hex: '#D8C3A0' },
  { id: 'brown', hex: '#7A5136' },
  { id: 'red', hex: '#C73E22' },
  { id: 'burgundy', hex: '#7B2433' },
  { id: 'pink', hex: '#F4BFC6' },
  { id: 'purple', hex: '#8E6BBF' },
  { id: 'yellow', hex: '#F2B53A' },
  { id: 'orange', hex: '#E07B39' },
  { id: 'multi', hex: 'conic-gradient(#C73E22, #F2B53A, #3E7A4F, #4F72C9, #C9B6E4, #C73E22)' },
]

export const COLOUR_IDS: readonly ColourId[] = COLOURS.map((c) => c.id)

export function isColourId(value: unknown): value is ColourId {
  return typeof value === 'string' && (COLOUR_IDS as readonly string[]).includes(value)
}

export function colourDef(id: ColourId): ColourDef {
  return COLOURS.find((c) => c.id === id)!
}
