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
 * This file is TypeScript and run through tsx specifically so it can import
 * the app's real scoring modules. It previously carried a hand-maintained
 * JavaScript copy of the position weighting, category profiles and scoring
 * formulas, which drifted from the originals every single time the formula
 * changed — meaning the scores this agent wrote back to the database
 * disagreed with the ones the app computed in the browser for the same
 * product. Importing the real implementation makes that class of bug
 * impossible rather than merely unlikely.
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { computeOverallScore } from '../src/lib/scoring/product-score'
import { computeSkinFit } from '../src/lib/scoring/skin-fit'
import type { Ingredient, ProductCategory } from '../src/types'

config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash'
const BATCH_LIMIT = Number(process.env.ENRICH_BATCH_LIMIT || 30)
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

interface ResearchResult {
  inci_name?: string | null
  aliases?: unknown
  category?: string
  comedogenic_rating?: unknown
  irritancy_rating?: unknown
  benefit_score?: unknown
  skin_type_fit?: unknown
  description?: unknown
}

function clamp(n: unknown, min: number, max: number): number {
  const v = Math.round(Number(n))
  return Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : min
}

async function researchIngredient(name: string): Promise<ResearchResult> {
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
  return JSON.parse(text) as ResearchResult
}

/**
 * Recomputes overall_score + skin_fit_results for every product from its
 * current ingredient data. Cheap pure-JS work (no external API calls), so
 * it's safe to run in full on every invocation — this is what makes newly
 * enriched ingredients (and any scoring-formula fix) actually show up on
 * products that were scanned before that data existed, instead of leaving
 * them stuck with whatever score was cached at scan time.
 */
async function rescoreAllProducts(): Promise<void> {
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, category')
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

  const byProduct = new Map<string, Ingredient[]>()
  for (const row of rows ?? []) {
    const ingredient = row.ingredient as unknown as Ingredient | null
    if (!ingredient) continue
    const list = byProduct.get(row.product_id) ?? []
    list.push(ingredient)
    byProduct.set(row.product_id, list)
  }

  let updated = 0
  for (const product of products) {
    const ingredients = byProduct.get(product.id) ?? []
    const { overallScore } = computeOverallScore(ingredients, product.category as ProductCategory)

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
        skinFit.map((s, i) => ({
          product_id: product.id,
          tag: s.tag,
          rank: i + 1,
          confidence: s.confidence,
        })),
      )
    }

    updated++
  }

  console.log(`Rescored ${updated} product(s).`)
}

async function main(): Promise<void> {
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
            aliases: Array.isArray(result.aliases)
              ? result.aliases.map((a) => String(a).toLowerCase())
              : [],
            category: CATEGORIES.includes(result.category ?? '') ? result.category : 'other',
            comedogenic_rating: clamp(result.comedogenic_rating, 0, 5),
            irritancy_rating: clamp(result.irritancy_rating, 0, 5),
            benefit_score: clamp(result.benefit_score, 0, 10),
            skin_type_fit: Array.isArray(result.skin_type_fit)
              ? result.skin_type_fit.filter((t) => SKIN_TAGS.includes(String(t)))
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
        console.error(`✗ ${ingredient.canonical_name}: ${(err as Error).message}`)
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
