import type { ItemStatus } from './types'

export type WardrobeView = 'wardrobe' | 'archived' | 'gone'

/** Which statuses each wardrobe view shows. Listed pieces are still in the wardrobe until sold. */
export const VIEW_STATUSES: Record<WardrobeView, readonly ItemStatus[]> = {
  wardrobe: ['active', 'occasion', 'sentimental', 'listed'],
  archived: ['archived'],
  gone: ['sold', 'donated'],
}
