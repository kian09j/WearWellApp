import type { Photo } from '../domain/types'
import { newId, nowIso } from '../domain/ids'
import { db } from './db'

export type NewPhoto = Omit<Photo, 'id' | 'createdAt'>

export async function savePhoto(photo: NewPhoto): Promise<string> {
  const id = newId()
  await db.photos.add({ ...photo, id, createdAt: nowIso() })
  return id
}

export async function deletePhoto(id: string): Promise<void> {
  await db.photos.delete(id)
}

export async function getPhoto(id: string): Promise<Photo | undefined> {
  return db.photos.get(id)
}
