/**
 * Scheduled enrichment agent: finds ingredients auto-inserted as "unrated"
 * placeholders (created when a scan hits an ingredient not yet in the
 * database), researches each via the Gemini API, and writes real ratings
 * back. Then rescores every product against the current ingredient data,
 * so both newly-enriched ingredients and any scoring-formula fix show up
 * on products that were scanned earlier. Runs server-side (GitHub
 * Actions), using the Supabase service-role key to bypass RLS — never run
 * this with a client-facing key, and never ship these credentials to the
 * browser bundle.
 *
 * Required env: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
 * Optional env: GEMINI_MODEL (default gemini-3.6-flash), ENRICH_BATCH_LIMIT
 * (default 30 — keeps each run comfortably inside the Gemini free tier; a
 * backlog beyond that is picked up across subsequent scheduled/manual runs).
 *
 * The scoring logic below (position weight, category profile, base score)
 * is a plain-JS mirror of src/lib/scoring/* — this script runs standalone
 * via `node`, not through the Vite/TS build, so it can't import those
 * directly. Keep the two in sync when the formula changes.
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash'
const BATCH_LIMIT = Number(process.env.ENRICH_BATCH_LIMIT || 30)
const REQUEST_DELAY_MS = 4000

// --- scoring (mirrors src/lib/scoring/*) ------------------------------

const NEUTRAL_SCORE = 5
const SAFE_BASELINE = 6
const DECAY_RATE = 0.15
const WEIGHT_FLOOR = 0.05
const LEAVE_ON = { comedogenicWeight: 1, irritancyWeight: 1 }
const CATEGORY_PROFILES = {
  cleanser: { comedogenicWeight: 0.3, irritancyWeight: 0.5 },
  mask: { comedogenicWeight: 0.5, irritancyWeight: 0.6 },
  serum: LEAVE_ON,
  moisturizer: LEAVE_ON,
  toner: LEAVE_ON,
  sunscreen: LEAVE_ON,
  exfoliant: LEAVE_ON,
  eye_cream: LEAVE_ON,
  oil: LEAVE_ON,
  essence: LEAVE_ON,
  other: LEAVE_ON,
}
const COMEDOGENIC_SENSITIVE_TAGS = ['acne-prone', 'oily']
const IRRITANCY_SENSITIVE_TAGS = ['sensitive']
const CONFLICT_PENALTY_FACTOR = 0.6
const SKIN_FIT_TOP_N = 3
const HIGH_IRRITANCY_THRESHOLD = 4
const HIGH_IRRITANCY_POSITION_CUTOFF = 5
const HIGH_IRRITANT_SCORE_CAP = 65

function clampScore(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function positionWeight(position) {
  return Math.max(WEIGHT_FLOOR, 1 / (1 + position * DECAY_RATE))
}

function normalizedPositionWeights(count) {
  const raw = Array.from({ length: count }, (_, i) => positionWeight(i))
  const total = raw.reduce((sum, w) => sum + w, 0)
  if (total === 0) return raw
  return raw.map((w) => w / total)
}

function ingredientBaseScore(ingredient, category) {
  if (!ingredient.is_rated || ingredient.benefit_score == null) return NEUTRAL_SCORE
  const { comedogenicWeight, irritancyWeight } = CATEGORY_PROFILES[category] ?? LEAVE_ON
  const baseline = SAFE_BASELINE + (ingredient.benefit_score / 10) * (10 - SAFE_BASELINE)
  const comedogenicPenalty = (ingredient.comedogenic_rating ?? 0) * comedogenicWeight
  const irritancyPenalty = (ingredient.irritancy_rating ?? 0) * irritancyWeight
  return clampScore(baseline - comedogenicPenalty - irritancyPenalty, 0, 10)
}

function computeOverallScore(ingredients, category) {
  if (ingredients.length === 0) return 50
  const weights = normalizedPositionWeights(ingredients.length)
  const weightedSum = ingredients.reduce(
    (sum, ingredient, i) => sum + ingredientBaseScore(ingredient, category) * weights[i],
    0,
  )
  const { irritancyWeight } = CATEGORY_PROFILES[category] ?? LEAVE_ON
  const highIrritantWarning =
    irritancyWeight >= 1 &&
    ingredients
      .slice(0, HIGH_IRRITANCY_POSITION_CUTOFF)
      .some((ing) => (ing.irritancy_rating ?? 0) >= HIGH_IRRITANCY_THRESHOLD)
  const rawScore = Math.round((weightedSum / 10) * 100)
  return highIrritantWarning ? Math.min(rawScore, HIGH_IRRITANT_SCORE_CAP) : rawScore
}

function computeSkinFit(ingredients) {
  if (ingredients.length === 0) return []
  const weights = normalizedPositionWeights(ingredients.length)
  const rawScores = new Map()

  for (const tag of SKIN_TAGS) {
    let score = 0
    ingredients.forEach((ingredient, i) => {
      const weight = weights[i]
      const benefit = ingredient.benefit_score ?? 5
      if ((ingredient.skin_type_fit ?? []).includes(tag)) score += weight * benefit
      if (COMEDOGENIC_SENSITIVE_TAGS.includes(tag)) {
        score -= weight * (ingredient.comedogenic_rating ?? 0) * CONFLICT_PENALTY_FACTOR
      }
      if (IRRITANCY_SENSITIVE_TAGS.includes(tag)) {
        score -= weight * (ingredient.irritancy_rating ?? 0) * CONFLICT_PENALTY_FACTOR
      }
    })
    rawScores.set(tag, clampScore(score, 0, 10))
  }

  return Array.from(rawScores.entries())
    .map(([tag, score]) => ({ tag, confidence: score / 10 }))
    .filter((r) => r.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, SKIN_FIT_TOP_N)
}

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

/**
 * Recomputes overall_score + skin_fit_results for every product from its
 * current ingredient data. Cheap pure-JS work (no external API calls), so
 * it's safe to run in full on every invocation — this is what makes newly
 * enriched ingredients (and any scoring-formula fix) actually show up on
 * products that were scanned before that data existed, instead of leaving
 * them stuck with whatever score was cached at scan time.
 */
async function rescoreAllProducts() {
  const { data: products, error: productsError } = await supabase.from('products').select('id, category')
  if (productsError) {
    console.error('Failed to fetch products for rescoring:', productsError.message)
    return
  }
  if (!products || products.length === 0) {
    console.log('No products to rescore.')
    return
  }

  const { data: rows, error: rowsError } = await supabase
    .from('product_ingredients')
    .select('product_id, position, ingredient:ingredients(*)')
    .order('position', { ascending: true })
  if (rowsError) {
    console.error('Failed to fetch product ingredients for rescoring:', rowsError.message)
    return
  }

  const byProduct = new Map()
  for (const row of rows ?? []) {
    if (!row.ingredient) continue
    if (!byProduct.has(row.product_id)) byProduct.set(row.product_id, [])
    byProduct.get(row.product_id).push(row.ingredient)
  }

  let updated = 0
  for (const product of products) {
    const ingredients = byProduct.get(product.id) ?? []
    const overallScore = computeOverallScore(ingredients, product.category)

    const { error: updateError } = await supabase
      .from('products')
      .update({ overall_score: overallScore })
      .eq('id', product.id)
    if (updateError) {
      console.error(`Failed to update score for product ${product.id}: ${updateError.message}`)
      continue
    }

    await supabase.from('skin_fit_results').delete().eq('product_id', product.id)
    const skinFit = computeSkinFit(ingredients)
    if (skinFit.length > 0) {
      await supabase.from('skin_fit_results').insert(
        skinFit.map((s, i) => ({ product_id: product.id, tag: s.tag, rank: i + 1, confidence: s.confidence })),
      )
    }

    updated++
  }

  console.log(`Rescored ${updated} product(s).`)
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

  let succeeded = 0
  let failed = 0

  if (!unrated || unrated.length === 0) {
    console.log('No unrated ingredients found.')
  } else {
    console.log(`Researching ${unrated.length} unrated ingredient(s)...`)

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

  await rescoreAllProducts()

  if (unrated && unrated.length > 0 && succeeded === 0) {
    console.error('Every ingredient failed — failing the run instead of reporting a false success.')
    process.exit(1)
  }
}

main()
