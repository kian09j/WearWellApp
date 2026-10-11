import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { addItem, deleteItem, getItem, listItems, makeItem, purgeDeletedPhotos, restoreItem, updateItem } from './items'
import { savePhoto } from './photos'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

const photo = () => ({ bytes: new Uint8Array([9, 9]).buffer, type: 'image/webp', width: 1, height: 1 })

describe('items', () => {
  it('needs only a name and category, and fills sensible defaults', () => {
    const coat = makeItem({ name: '  Wool coat ', category: 'coats' })
    expect(coat).toMatchObject({
      name: 'Wool coat',
      kind: 'owned',
      status: 'active',
      seasons: ['autumn', 'winter'],
      favourite: false,
      placeholder: false,
    })
    expect(coat.price).toBeUndefined()
  })

  it('delete hides an item and Undo brings it back with its photo', async () => {
    const id = await addItem({ name: 'Jeans', category: 'jeans' })
    const photoId = await savePhoto(photo())
    await updateItem(id, { photoId })

    await deleteItem(id)
    expect(await getItem(id)).toBeUndefined()
    expect(await listItems()).toHaveLength(0)

    await restoreItem(id)
    const back = await getItem(id)
    expect(back?.photoId).toBe(photoId)
    expect(await db.photos.get(photoId)).toBeDefined()
  })

  it('frees photos of items deleted more than 30 days ago, keeping recent ones for Undo', async () => {
    const old = await addItem({ name: 'Old', category: 'tshirts' })
    const recent = await addItem({ name: 'Recent', category: 'tshirts' })
    const p1 = await savePhoto(photo())
    const p2 = await savePhoto(photo())
    await updateItem(old, { photoId: p1 })
    await updateItem(recent, { photoId: p2 })
    await db.items.update(old, { deletedAt: '2026-08-01T10:00:00.000Z' })
    await db.items.update(recent, { deletedAt: '2026-10-05T10:00:00.000Z' })

    expect(await purgeDeletedPhotos(30, new Date('2026-10-10T12:00:00Z'))).toBe(1)
    expect(await db.photos.get(p1)).toBeUndefined()
    expect(await db.photos.get(p2)).toBeDefined()
    expect((await db.items.get(old))?.photoId).toBeUndefined()
  })
})
