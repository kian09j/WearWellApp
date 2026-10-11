import { describe, expect, it, vi } from 'vitest'
import type { ScanModel } from './claude.js'
import { memoryLimiter, upstashLimiter } from './rateLimit.js'
import { handleScan } from './scanHandler.js'

const IMAGE = 'A'.repeat(400) // a valid base64 string, long enough
const DEVICE = '0f8b2c4e-1111-4222-8333-944455556666'
const NOW = () => new Date('2026-10-11T12:00:00Z')

const goodAnswer = {
  items: [
    { category: 'knitwear', colour: 'navy', description: 'Navy wool jumper', confidence: 'high' },
    { category: 'tshirts', colour: null, description: 'Folded tee', confidence: 'low' },
  ],
  notes: 'The stack on the left was hard to count.',
}

function request(body: unknown, init: { origin?: string; method?: string; ip?: string } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (init.origin) headers.origin = init.origin
  if (init.ip) headers['x-real-ip'] = init.ip
  return new Request('https://www.wearwellapp.com/api/scan', {
    method: init.method ?? 'POST',
    headers,
    body: init.method === 'OPTIONS' || init.method === 'GET' ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  })
}

const valid = { image: IMAGE, mediaType: 'image/webp', deviceId: DEVICE }

function deps(model: ScanModel | null = async () => ({ kind: 'ok', json: goodAnswer }), env: Record<string, string> = {}) {
  return { model, limiter: memoryLimiter(), env, now: NOW }
}

describe('scan endpoint', () => {
  it('returns the checked list of pieces and how many scans are left today', async () => {
    const res = await handleScan(request(valid), deps())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ...goodAnswer, remaining: 4, limit: 5 })
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  it('says so when no API key is configured yet', async () => {
    const res = await handleScan(request(valid), deps(null))
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: 'not_configured' })
  })

  it('rejects malformed requests', async () => {
    for (const body of ['not json', { ...valid, image: 'short' }, { ...valid, image: `${IMAGE}!` }, { ...valid, mediaType: 'image/gif' }, { ...valid, deviceId: 'x' }]) {
      const res = await handleScan(request(body), deps())
      expect(res.status).toBe(400)
    }
    expect((await handleScan(request(valid, { method: 'GET' }), deps())).status).toBe(405)
  })

  it('stops a device after its daily limit, and tells it when it resets', async () => {
    const d = deps(undefined, { SCAN_DAILY_LIMIT: '2' })
    expect((await handleScan(request(valid), d)).status).toBe(200)
    expect((await handleScan(request(valid), d)).status).toBe(200)
    const third = await handleScan(request(valid), d)
    expect(third.status).toBe(429)
    expect(await third.json()).toEqual({ error: 'limit', limit: 2, resetAt: '2026-10-12T00:00:00.000Z' })
    // another device still can
    expect((await handleScan(request({ ...valid, deviceId: 'another-device-1234' }), d)).status).toBe(200)
  })

  it('caps one IP address and the whole app as well', async () => {
    const d = deps(undefined, { SCAN_IP_DAILY_LIMIT: '1', SCAN_GLOBAL_DAILY_LIMIT: '2' })
    expect((await handleScan(request(valid, { ip: '1.1.1.1' }), d)).status).toBe(200)
    expect((await handleScan(request({ ...valid, deviceId: 'second-device-123' }, { ip: '1.1.1.1' }), d)).status).toBe(429)
    expect((await handleScan(request({ ...valid, deviceId: 'third-device-1234' }, { ip: '2.2.2.2' }), d)).status).toBe(200)
    const busy = await handleScan(request({ ...valid, deviceId: 'fourth-device-123' }, { ip: '3.3.3.3' }), d)
    expect(busy.status).toBe(429)
    expect((await busy.json()).error).toBe('busy')
  })

  it('does not count a scan when the model request fails', async () => {
    let calls = 0
    const flaky: ScanModel = async () => {
      calls++
      if (calls === 1) throw Object.assign(new Error('overloaded'), { status: 529 })
      return { kind: 'ok', json: goodAnswer }
    }
    const d = deps(flaky, { SCAN_DAILY_LIMIT: '1' })
    expect((await handleScan(request(valid), d)).status).toBe(502)
    expect((await handleScan(request(valid), d)).status).toBe(200)
  })

  it('reports photos it could not read, and answers that are not a scan result', async () => {
    const declined = await handleScan(request(valid), deps(async () => ({ kind: 'unreadable', reason: 'refusal' })))
    expect(declined.status).toBe(422)
    const junk = await handleScan(request(valid), deps(async () => ({ kind: 'ok', json: { hello: 'world' } })))
    expect(junk.status).toBe(422)
  })

  it('allows the app and its native shells, and refuses other websites', async () => {
    const preflight = await handleScan(request(null, { method: 'OPTIONS', origin: 'capacitor://localhost' }), deps())
    expect(preflight.status).toBe(204)
    expect(preflight.headers.get('access-control-allow-origin')).toBe('capacitor://localhost')
    const app = await handleScan(request(valid, { origin: 'https://www.wearwellapp.com' }), deps())
    expect(app.headers.get('access-control-allow-origin')).toBe('https://www.wearwellapp.com')
    const stranger = await handleScan(request(valid, { origin: 'https://evil.example' }), deps())
    expect(stranger.status).toBe(403)
    expect(stranger.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('refuses to scan when the limit counters are unavailable', async () => {
    const broken = { hit: async () => { throw new Error('down') }, refund: async () => {} }
    const res = await handleScan(request(valid), { ...deps(), limiter: broken })
    expect(res.status).toBe(503)
  })
})

describe('Upstash limiter', () => {
  it('increments and sets the expiry in one pipelined call', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([{ result: 3 }, { result: 1 }])))
    const limiter = upstashLimiter('https://redis.example/', 'token', fetchMock as unknown as typeof fetch)
    expect(await limiter.hit('scan:d:x:2026-10-11', 93600)).toBe(3)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://redis.example/pipeline')
    expect(JSON.parse(init.body as string)).toEqual([
      ['INCR', 'scan:d:x:2026-10-11'],
      ['EXPIRE', 'scan:d:x:2026-10-11', 93600, 'NX'],
    ])
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token')
  })
})
