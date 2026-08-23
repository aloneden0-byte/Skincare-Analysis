/**
 * Scheduled enrichment agent: finds ingredients auto-inserted as "unrated"
 * placeholders (created when a scan hits an ingredient not yet in the
 * database), researches each via the Gemini API, and writes real ratings
 * back. Runs server-side (GitHub Actions), using the Supabase service-role
 * key to bypass RLS — never run this with a client-facing key, and never
 * ship these credentials to the browser bundle.
 *
 * Required env: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
 * Optional env: GEMINI_MODEL (default gemini-2.0-flash), ENRICH_BATCH_LIMIT
 * (default 15 — keeps each run comfortably inside the Gemini free tier;
 * a backlog is simply picked up across subsequent scheduled runs).
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
const BATCH_LIMIT = Number(process.env.ENRICH_BATCH_LIMIT || 15)
const REQUEST_DELAY_MS = 4000

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !GEMINI_API_KEY) {
  console.error('Missing required env: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const CATEGORIES = [
  'humectant', 'emollient', 'occlusive', 'exfoliant', 'active', 'preservative',
  'fragrance', 'alcohol', 'silicone', 'sunscreen-filter', 'surfactant',
  'thickener', 'film-former', 'colorant', 'solvent', 'peptide', 'other',
]
const SKIN_TAGS = ['oily', 'dry', 'combination', 'normal', 'acne-prone', 'sensitive', 'mature', 'all']

const responseSchema = {
  type: 'object',
  properties: {
    inci_name: { type: 'string', nullable: true },
    aliases: { type: 'array', items: { type: 'string' } },
    category: { type: 'string', enum: CATEGORIES },
    comedogenic_rating: { type: 'integer' },
    irritancy_rating: { type: 'integer' },
    benefit_score: { type: 'integer' },
    skin_type_fit: { type: 'array', items: { type: 'string', enum: SKIN_TAGS } },
    description: { type: 'string' },
  },
  required: ['category', 'comedogenic_rating', 'irritancy_rating', 'benefit_score', 'skin_type_fit', 'description'],
}

function clamp(n, min, max) {
  const v = Math.round(Number(n))
  return Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : min
}

async function researchIngredient(name) {
  const prompt = `You are a cosmetic chemistry reference assistant. For the cosmetic/skincare ingredient "${name}" (an INCI or common name that may include OCR noise from a scanned product label), provide:
- inci_name: the formal INCI name if different from the given name, else null
- aliases: other common names/spellings (lowercase, empty array if none)
- category: exactly one of ${CATEGORIES.join(', ')}
- comedogenic_rating: 0-5 integer (0 = won't clog pores, 5 = highly comedogenic)
- irritancy_rating: 0-5 integer (0 = essentially never irritating, 5 = frequently irritating/sensitizing)
- benefit_score: 0-10 integer (overall skincare benefit/value; 0 = no benefit e.g. inert filler or pure allergen, 10 = major well-established active)
- skin_type_fit: subset of ${SKIN_TAGS.join(', ')} this ingredient particularly suits (empty array if nothing stands out, "all" if broadly suitable for every skin type)
- description: one concise, informational sentence — no medical claims

If "${name}" doesn't look like a real cosmetic ingredient (e.g. garbled OCR text), make a best-effort guess at the closest real ingredient; if genuinely unidentifiable, set benefit_score to 0 and skin_type_fit to an empty array.`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema },
      }),
    },
  )

  if (!res.ok) {
    throw new Error(`Gemini API error ${res.status}: ${(await res.text()).slice(0, 300)}`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini returned no content')
  return JSON.parse(text)
}

async function main() {
  const { data: unrated, error } = await supabase
    .from('ingredients')
    .select('id, canonical_name')
    .eq('is_rated', false)
    .limit(BATCH_LIMIT)

  if (error) {
    console.error('Failed to fetch unrated ingredients:', error.message)
    process.exit(1)
  }

  if (!unrated || unrated.length === 0) {
    console.log('No unrated ingredients found. Nothing to do.')
    return
  }

  console.log(`Researching ${unrated.length} unrated ingredient(s)...`)

  let succeeded = 0
  let failed = 0

  for (const ingredient of unrated) {
    try {
      const result = await researchIngredient(ingredient.canonical_name)

      const { error: updateError } = await supabase
        .from('ingredients')
        .update({
          inci_name: result.inci_name || null,
          aliases: Array.isArray(result.aliases) ? result.aliases.map((a) => String(a).toLowerCase()) : [],
          category: CATEGORIES.includes(result.category) ? result.category : 'other',
          comedogenic_rating: clamp(result.comedogenic_rating, 0, 5),
          irritancy_rating: clamp(result.irritancy_rating, 0, 5),
          benefit_score: clamp(result.benefit_score, 0, 10),
          skin_type_fit: Array.isArray(result.skin_type_fit)
            ? result.skin_type_fit.filter((t) => SKIN_TAGS.includes(t))
            : [],
          description: String(result.description || '').slice(0, 500),
          is_rated: true,
          source: 'ai-researched',
        })
        .eq('id', ingredient.id)

      if (updateError) throw new Error(updateError.message)

      console.log(`✓ ${ingredient.canonical_name}`)
      succeeded++
    } catch (err) {
      console.error(`✗ ${ingredient.canonical_name}: ${err.message}`)
      failed++
    }

    await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS))
  }

  console.log(`Done. ${succeeded} enriched, ${failed} failed.`)
}

main()
