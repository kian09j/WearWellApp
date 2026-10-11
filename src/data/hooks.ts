import { useLiveQuery } from 'dexie-react-hooks'
import type { Item, Outfit, Settings, WearLog } from '../domain/types'
import { listItems } from './items'
import { listOutfits } from './outfits'
import { hasSampleData } from './sample'
import { getSettings } from './settings'
import { listWears } from './wears'

// Live queries: components re-render automatically whenever the underlying data changes.
// Each returns undefined while the first read is in flight.

export function useItems(): Item[] | undefined {
  return useLiveQuery(listItems)
}

export function useWears(): WearLog[] | undefined {
  return useLiveQuery(listWears)
}

export function useOutfits(): Outfit[] | undefined {
  return useLiveQuery(listOutfits)
}

export function useSettings(): Settings | undefined {
  return useLiveQuery(getSettings)
}

export function useHasSampleData(): boolean | undefined {
  return useLiveQuery(hasSampleData)
}
