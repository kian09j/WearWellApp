import type { Outfit } from '../domain/types'
import { newId, nowIso } from '../domain/ids'
import { alive, db } from './db'

export async function saveOutfit(name: string, itemIds: string[]): Promise<string> {
  const now = nowIso()
  const outfit: Outfit = { id: newId(), name: name.trim(), itemIds, sample: false, createdAt: now, updatedAt: now }
  await db.outfits.add(outfit)
  return outfit.id
}

export async function updateOutfit(id: string, patch: Partial<Pick<Outfit, 'name' | 'itemIds'>>): Promise<void> {
  await db.outfits.update(id, { ...patch, updatedAt: nowIso() })
}

export async function deleteOutfit(id: string): Promise<void> {
  const now = nowIso()
  await db.outfits.update(id, { deletedAt: now, updatedAt: now })
}

export async function restoreOutfit(id: string): Promise<void> {
  await db.outfits.update(id, { deletedAt: undefined, updatedAt: nowIso() })
}

export async function getOutfit(id: string): Promise<Outfit | undefined> {
  const outfit = await db.outfits.get(id)
  return outfit && alive(outfit) ? outfit : undefined
}

export async function listOutfits(): Promise<Outfit[]> {
  return (await db.outfits.toArray()).filter(alive)
}
