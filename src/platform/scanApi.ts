import type { NewPhoto } from '../data'
import { bytesToBase64 } from '../data/backup'
import { validateScanResult, type ScanResult } from '../domain/scan'
import { isNative } from './native'

// Talks to the scan function (api/scan.ts). On the web it's the same site; the native apps call
// the live site. VITE_SCAN_API_URL overrides both, e.g. to test against a deployed preview.
const SCAN_URL = (import.meta.env.VITE_SCAN_API_URL as string | undefined) ?? (isNative() ? 'https://www.wearwellapp.com/api/scan' : '/api/scan')

export type ScanErrorKind = 'offline' | 'notConfigured' | 'limit' | 'busy' | 'tooLarge' | 'unreadable' | 'failed'

export class ScanError extends Error {
  constructor(
    readonly kind: ScanErrorKind,
    readonly resetAt?: string,
    readonly limit?: number,
  ) {
    super(kind)
  }
}

export interface ScanResponse extends ScanResult {
  remaining?: number
  limit?: number
}

const isOffline = () => navigator.onLine === false
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

export async function scanPhoto(photo: NewPhoto, deviceId: string): Promise<ScanResponse> {
  if (isOffline()) throw new ScanError('offline')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 75_000)
  let res: Response
  try {
    res = await fetch(SCAN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: bytesToBase64(photo.bytes), mediaType: photo.type, deviceId }),
      signal: controller.signal,
    })
  } catch {
    throw new ScanError(isOffline() ? 'offline' : 'failed')
  } finally {
    clearTimeout(timer)
  }

  // no scan function here at all (e.g. the plain dev server answers with the app's HTML)
  if (!res.headers.get('content-type')?.includes('application/json')) throw new ScanError(res.status === 413 ? 'tooLarge' : 'notConfigured')
  let data: Record<string, unknown> | null = null
  try {
    data = (await res.json()) as Record<string, unknown>
  } catch {
    throw new ScanError('failed')
  }

  if (res.ok) {
    const result = validateScanResult(data)
    if (!result) throw new ScanError('unreadable')
    return { ...result, remaining: num(data?.remaining), limit: num(data?.limit) }
  }
  switch (res.status) {
    case 503:
      throw new ScanError(data?.error === 'not_configured' ? 'notConfigured' : 'failed')
    case 429:
      throw new ScanError(data?.error === 'busy' ? 'busy' : 'limit', typeof data?.resetAt === 'string' ? data.resetAt : undefined, num(data?.limit))
    case 413:
      throw new ScanError('tooLarge')
    case 422:
      throw new ScanError('unreadable')
    default:
      throw new ScanError('failed')
  }
}
