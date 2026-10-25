import type { DateKey, WearLog } from './types'

// crypto.randomUUID only exists in secure contexts (https, localhost). Testing on a phone
// over the local network is plain http, so fall back to getRandomValues, which works everywhere.
export function newId(): string {
  if (typeof crypto.randomUUID === 'function' && globalThis.isSecureContext !== false) {
    return crypto.randomUUID()
  }
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6]! & 0x0f) | 0x40
  b[8] = (b[8]! & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

export function nowIso(): string {
  return new Date().toISOString()
}

/**
 * A wear's id is the piece and the day. There is only ever one wear per piece per day, so two
 * devices that log the same wear (offline, say) give it the same id, and a future sync merges
 * them instead of counting the wear twice.
 */
export function wearId(itemId: string, date: DateKey): string {
  return `${itemId}:${date}`
}

/** A live wear beats an undone one; otherwise the one changed last wins. */
const isBetterWear = (a: WearLog, b: WearLog) => (!a.deletedAt !== !b.deletedAt ? !a.deletedAt : a.updatedAt > b.updatedAt)

/** Give wears saved with random ids (before version 2, or in old backups) their fixed ids, one per piece and day. */
export function rekeyWears(wears: readonly WearLog[]): WearLog[] {
  const byId = new Map<string, WearLog>()
  for (const wear of wears) {
    const id = wearId(wear.itemId, wear.date)
    const kept = byId.get(id)
    if (!kept || isBetterWear(wear, kept)) byId.set(id, { ...wear, id })
  }
  return [...byId.values()]
}
