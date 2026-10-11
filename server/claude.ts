import Anthropic from '@anthropic-ai/sdk'
import { CATEGORY_IDS } from '../src/domain/categories.js'
import { COLOUR_IDS } from '../src/domain/colours.js'
import { SCAN_OUTPUT_SCHEMA, type ScanMediaType } from '../src/domain/scan.js'

// One request to Claude per scan: the photo plus instructions, answered in a fixed JSON shape
// (structured output). The photo is sent and forgotten: nothing here stores it.

export const DEFAULT_SCAN_MODEL = 'claude-opus-5-5'

export type ScanModelOutcome =
  | { kind: 'ok'; json: unknown }
  /** Claude declined the image, or the answer didn't finish: treat as "couldn't read this photo". */
  | { kind: 'unreadable'; reason: string }

export type ScanModel = (image: { data: string; mediaType: ScanMediaType }) => Promise<ScanModelOutcome>

const SYSTEM = `You help people catalogue the clothes they already own. You will see one photo of a section of someone's wardrobe: a shelf, a rail, a drawer or a pile.

List every piece of clothing, footwear, bag or accessory you can see, one entry per physical piece. If there are three similar white T-shirts, that is three entries.

For each piece:
- category: the closest of ${CATEGORY_IDS.join(', ')}. tshirts covers T-shirts, tops and vests; knitwear covers jumpers and cardigans; blazers covers blazers and suits; other is for anything that fits nowhere else.
- colour: the main colour, one of ${COLOUR_IDS.join(', ')}. Use multi for clear patterns or several colours, and null if you genuinely can't tell.
- description: two to five plain English words a person would use as the piece's name, such as "Navy striped shirt" or "Grey wool jumper". No brand guesses.
- confidence: high when the piece is clearly visible, medium when partly hidden, low when you are inferring it (for example the lower layers of a folded stack).

Folded stacks: count the visible edges and add an entry for each layer you can make out, with medium or low confidence. Do not include hangers, boxes, baskets, furniture or people.

notes: one short, friendly sentence for the person if something limited the count (a dense stack, dim light, items hidden behind others), otherwise an empty string. If the photo shows no clothes at all, return no items and say so in notes.`

export function claudeScanModel(env: Record<string, string | undefined>): ScanModel | null {
  const apiKey = env.ANTHROPIC_API_KEY
  if (!apiKey) return null
  const client = new Anthropic({ apiKey, timeout: 55_000, maxRetries: 1 })
  const model = env.SCAN_MODEL || DEFAULT_SCAN_MODEL
  const withFallback = !model.startsWith('claude-haiku')
  const effort = (['low', 'medium', 'high'] as const).find((e) => e === env.SCAN_EFFORT) ?? 'low'

  return async (image) => {
    const response = await client.beta.messages.create({
      model,
      max_tokens: 8000,
      // if a safety classifier declines the photo, Anthropic retries it on its recommended model
      // (Haiku models have no server-side fallback, so it is left off for them)
      ...(withFallback ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
      output_config: { effort, format: { type: 'json_schema', schema: SCAN_OUTPUT_SCHEMA } },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } },
            { type: 'text', text: 'List the clothes in this photo.' },
          ],
        },
      ],
    })

    if (response.stop_reason === 'refusal') return { kind: 'unreadable', reason: 'refusal' }
    if (response.stop_reason === 'max_tokens') return { kind: 'unreadable', reason: 'max_tokens' }
    const text = response.content.find((b) => b.type === 'text')
    if (!text || text.type !== 'text') return { kind: 'unreadable', reason: 'no_text' }
    try {
      return { kind: 'ok', json: JSON.parse(text.text) }
    } catch {
      return { kind: 'unreadable', reason: 'invalid_json' }
    }
  }
}
