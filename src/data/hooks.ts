import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Item, Outfit, Settings, WearLog } from '../domain/types'
import { getItem, listItems } from './items'
import { getOutfit, listOutfits } from './outfits'
import { getPhoto } from './photos'
import { hasSampleData } from './sample'
import { getSettings } from './settings'
import { listWears } from './wears'

// Live queries: components re-render automatically whenever the underlying data changes.
// Each returns undefined while the first read is in flight.

export function useItems(): Item[] | undefined {
  return useLiveQuery(listItems)
}

/** undefined while loading, null if the item does not exist (or was deleted). */
export function useItem(id: string | undefined): Item | null | undefined {
  return useLiveQuery(async () => (id ? ((await getItem(id)) ?? null) : null), [id])
}

export function useWears(): WearLog[] | undefined {
  return useLiveQuery(listWears)
}

export function useOutfits(): Outfit[] | undefined {
  return useLiveQuery(listOutfits)
}

/** undefined while loading, null if missing. */
export function useOutfit(id: string | undefined): Outfit | null | undefined {
  return useLiveQuery(async () => (id ? ((await getOutfit(id)) ?? null) : null), [id])
}

export function useSettings(): Settings | undefined {
  return useLiveQuery(getSettings)
}

export function useHasSampleData(): boolean | undefined {
  return useLiveQuery(hasSampleData)
}

/** An object URL for a stored photo, revoked automatically when no longer needed. */
export function usePhotoUrl(photoId: string | undefined): string | undefined {
  const photo = useLiveQuery(async () => (photoId ? ((await getPhoto(photoId)) ?? null) : null), [photoId])
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!photo) {
      setUrl(undefined)
      return
    }
    const next = URL.createObjectURL(new Blob([photo.bytes], { type: photo.type }))
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [photo])
  return url
}
