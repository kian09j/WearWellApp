// Vercel serverless function: POST /api/scan. The only server-side code in WearWell.
// Settings live in Vercel → Project → Settings → Environment Variables (see README).
import { claudeScanModel } from '../server/claude'
import { limiterFromEnv } from '../server/rateLimit'
import { handleScan } from '../server/scanHandler'

const env = process.env
const model = claudeScanModel(env)
const { limiter } = limiterFromEnv(env)

export function POST(request: Request): Promise<Response> {
  return handleScan(request, { model, limiter, env })
}

export function OPTIONS(request: Request): Promise<Response> {
  return handleScan(request, { model, limiter, env })
}
