// Daily scan limits, so one phone (or a script) can't run up the API bill.
// In production the counters live in Upstash Redis (add it from the Vercel Marketplace; it sets
// the env vars below). Without Redis an in-memory counter is used, which only holds within one
// running server instance: fine for local testing, too weak for production.

export interface Limiter {
  /** Add one to the counter and return the new value. The counter expires after `ttlSeconds`. */
  hit(key: string, ttlSeconds: number): Promise<number>
  /** Take one back (used when a scan fails, so it doesn't count). */
  refund(key: string): Promise<void>
}

export function memoryLimiter(now: () => number = Date.now): Limiter {
  const counters = new Map<string, { count: number; expires: number }>()
  return {
    async hit(key, ttlSeconds) {
      const current = counters.get(key)
      if (!current || current.expires <= now()) {
        counters.set(key, { count: 1, expires: now() + ttlSeconds * 1000 })
        return 1
      }
      current.count++
      return current.count
    },
    async refund(key) {
      const current = counters.get(key)
      if (current && current.count > 0) current.count--
    },
  }
}

/** Upstash Redis over its REST API (one pipelined round trip per hit). */
export function upstashLimiter(url: string, token: string, fetchImpl: typeof fetch = fetch): Limiter {
  const pipeline = async (commands: (string | number)[][]) => {
    const res = await fetchImpl(`${url.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(commands),
    })
    if (!res.ok) throw new Error(`Upstash ${res.status}`)
    return (await res.json()) as { result?: unknown; error?: string }[]
  }
  return {
    async hit(key, ttlSeconds) {
      const [incr] = await pipeline([
        ['INCR', key],
        ['EXPIRE', key, ttlSeconds, 'NX'],
      ])
      if (!incr || incr.error !== undefined || typeof incr.result !== 'number') throw new Error('Upstash INCR failed')
      return incr.result
    },
    async refund(key) {
      await pipeline([['DECR', key]])
    },
  }
}

export function limiterFromEnv(env: Record<string, string | undefined>): { limiter: Limiter; persistent: boolean } {
  // the Vercel Marketplace integration may name them either way
  const url = env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL
  const token = env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN
  if (url && token) return { limiter: upstashLimiter(url, token), persistent: true }
  return { limiter: sharedMemory, persistent: false }
}

const sharedMemory = memoryLimiter()
