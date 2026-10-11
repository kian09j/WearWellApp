import { SCAN_MAX_BASE64, SCAN_MEDIA_TYPES, validateScanResult, type ScanMediaType } from '../src/domain/scan.js'
import type { ScanModel } from './claude.js'
import type { Limiter } from './rateLimit.js'

// POST /api/scan: { image: base64, mediaType, deviceId } -> { items, notes, remaining, limit }
// The API key never leaves the server. The photo is passed to Claude and dropped; it is never
// written anywhere or logged. Each device, each IP address and the whole app get a daily limit.

export interface ScanDeps {
  model: ScanModel | null
  limiter: Limiter
  env: Record<string, string | undefined>
  now?: () => Date
}

const APP_ORIGINS = [
  'https://www.wearwellapp.com',
  'https://wearwellapp.com',
  'capacitor://localhost', // iOS app
  'https://localhost', // Android app
  'http://localhost',
  'http://localhost:5173', // npm run dev
  'http://localhost:4173', // npm run preview
]
const VERCEL_PREVIEW = /^https:\/\/[a-z0-9-]+\.vercel\.app$/

/** Keep each counter a little over a day; the date in the key does the daily reset. */
const COUNTER_TTL_SECONDS = 26 * 60 * 60

function allowedOrigin(origin: string | null, env: ScanDeps['env']): boolean {
  if (!origin) return false
  const extra = (env.SCAN_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return APP_ORIGINS.includes(origin) || extra.includes(origin) || VERCEL_PREVIEW.test(origin)
}

function corsHeaders(origin: string | null, env: ScanDeps['env']): Record<string, string> {
  if (!origin || !allowedOrigin(origin, env)) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

const intEnv = (value: string | undefined, fallback: number) => {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : fallback
}

const isBase64 = (s: string) => /^[A-Za-z0-9+/]+={0,2}$/.test(s)

export async function handleScan(req: Request, deps: ScanDeps): Promise<Response> {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin, deps.env)
  const reply = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors },
    })

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return reply(405, { error: 'method' })
  // other websites must not be able to spend our API credits from their visitors' browsers
  if (origin && !allowedOrigin(origin, deps.env)) return reply(403, { error: 'origin' })
  if (!deps.model) return reply(503, { error: 'not_configured' })

  let body: Record<string, unknown>
  try {
    const text = await req.text()
    if (text.length > SCAN_MAX_BASE64 + 1_000) return reply(413, { error: 'too_large' })
    const parsed: unknown = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object') throw new Error('not an object')
    body = parsed as Record<string, unknown>
  } catch {
    return reply(400, { error: 'bad_request' })
  }

  const { image, mediaType, deviceId } = body
  if (
    typeof image !== 'string' ||
    image.length < 100 ||
    !isBase64(image) ||
    !SCAN_MEDIA_TYPES.includes(mediaType as ScanMediaType) ||
    typeof deviceId !== 'string' ||
    !/^[A-Za-z0-9-]{8,64}$/.test(deviceId)
  ) {
    return reply(400, { error: 'bad_request' })
  }
  if (image.length > SCAN_MAX_BASE64) return reply(413, { error: 'too_large' })

  // daily limits: per device, per IP address, and for the whole app (a cost ceiling)
  const now = deps.now?.() ?? new Date()
  const day = now.toISOString().slice(0, 10)
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString()
  const limits = {
    device: intEnv(deps.env.SCAN_DAILY_LIMIT, 5),
    ip: intEnv(deps.env.SCAN_IP_DAILY_LIMIT, 20),
    all: intEnv(deps.env.SCAN_GLOBAL_DAILY_LIMIT, 100),
  }
  const ip = req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const keys = { device: `scan:d:${deviceId}:${day}`, ip: `scan:i:${ip}:${day}`, all: `scan:all:${day}` }
  const counted: string[] = []
  const refundAll = async () => {
    await Promise.allSettled(counted.map((k) => deps.limiter.refund(k)))
  }

  let deviceCount: number
  try {
    deviceCount = await deps.limiter.hit(keys.device, COUNTER_TTL_SECONDS)
    counted.push(keys.device)
    if (deviceCount > limits.device) return reply(429, { error: 'limit', limit: limits.device, resetAt: tomorrow })
    const ipCount = await deps.limiter.hit(keys.ip, COUNTER_TTL_SECONDS)
    counted.push(keys.ip)
    if (ipCount > limits.ip) {
      await refundAll()
      return reply(429, { error: 'limit', limit: limits.device, resetAt: tomorrow })
    }
    const allCount = await deps.limiter.hit(keys.all, COUNTER_TTL_SECONDS)
    counted.push(keys.all)
    if (allCount > limits.all) {
      await refundAll()
      return reply(429, { error: 'busy', resetAt: tomorrow })
    }
  } catch (err) {
    // without working limits we'd have no cost ceiling, so don't scan
    console.error('scan: limiter unavailable', err instanceof Error ? err.message : err)
    return reply(503, { error: 'unavailable' })
  }

  try {
    const outcome = await deps.model({ data: image, mediaType: mediaType as ScanMediaType })
    if (outcome.kind === 'unreadable') return reply(422, { error: 'unreadable' })
    const result = validateScanResult(outcome.json)
    if (!result) return reply(422, { error: 'unreadable' })
    return reply(200, { ...result, remaining: Math.max(0, limits.device - deviceCount), limit: limits.device })
  } catch (err) {
    // nothing came back, so this attempt shouldn't use up anyone's scans
    await refundAll()
    const status = (err as { status?: number })?.status
    console.error('scan: model request failed', status ?? (err instanceof Error ? err.name : 'unknown'))
    return reply(502, { error: 'failed' })
  }
}
