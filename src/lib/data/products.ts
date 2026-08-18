import { supabase } from '@/lib/supabase'
import type { ParsedIngredientMatch, Product, ProductCategory, SkinFitResult } from '@/types'
import { hashIngredientSequence } from '@/lib/ingredients/hash'
import { computeOverallScore } from '@/lib/scoring/product-score'
import { computeSkinFit } from '@/lib/scoring/skin-fit'

const SCORE_VERSION = 1

export interface CreateProductResult {
  product: Product
  highIrritantWarning: boolean
  skinFit: SkinFitResult[]
}

/**
 * Creates (or reuses, via the ingredient-list hash) a Product from a set of
 * resolved ingredient matches, computes and persists its score, and links
 * the scan to it. Reusing an existing product for an identical ingredient
 * sequence is the efficiency/caching requirement in practice: repeat scans
 * of the same product skip re-scoring entirely.
 */
export async function createOrGetProduct(
  userId: string,
  rawOcrText: string,
  category: ProductCategory,
  matches: ParsedIngredientMatch[],
): Promise<CreateProductResult> {
  const orderedIngredients = matches.map((m) => m.ingredient)
  const ingredientListHash = await hashIngredientSequence(orderedIngredients.map((i) => i.id))

  const { overallScore, highIrritantWarning } = computeOverallScore(orderedIngredients, category)
  const skinFitScores = computeSkinFit(orderedIngredients)

  const { data: product, error: productError } = await supabase
    .from('products')
    .upsert(
      {
        category,
        raw_ocr_text: rawOcrText,
        ingredient_list_hash: ingredientListHash,
        overall_score: overallScore,
        score_version: SCORE_VERSION,
      },
      { onConflict: 'ingredient_list_hash' },
    )
    .select('*')
    .single()

  if (productError || !product) {
    throw new Error(`Failed to save product: ${productError?.message}`)
  }

  const { error: piError } = await supabase.from('product_ingredients').upsert(
    matches.map((m) => ({
      product_id: product.id,
      ingredient_id: m.ingredient.id,
      position: m.position,
      raw_token: m.rawToken,
      match_score: m.matchScore,
    })),
    { onConflict: 'product_id,position', ignoreDuplicates: true },
  )
  if (piError) throw new Error(`Failed to save product ingredients: ${piError.message}`)

  if (skinFitScores.length > 0) {
    const { error: sfError } = await supabase.from('skin_fit_results').upsert(
      skinFitScores.map((s, i) => ({
        product_id: product.id,
        tag: s.tag,
        rank: i + 1,
        confidence: s.confidence,
      })),
      { onConflict: 'product_id,tag', ignoreDuplicates: true },
    )
    if (sfError) throw new Error(`Failed to save skin-fit results: ${sfError.message}`)
  }

  const { data: skinFit } = await supabase
    .from('skin_fit_results')
    .select('*')
    .eq('product_id', product.id)
    .order('rank', { ascending: true })

  await supabase.from('scans').insert({
    user_id: userId,
    product_id: product.id,
    ocr_raw_text: rawOcrText,
    status: 'complete',
  })

  return { product, highIrritantWarning, skinFit: skinFit ?? [] }
}

export async function getProduct(productId: string): Promise<Product | null> {
  const { data, error } = await supabase.from('products').select('*').eq('id', productId).maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function getProductIngredients(productId: string) {
  const { data, error } = await supabase
    .from('product_ingredients')
    .select('*, ingredient:ingredients(*)')
    .eq('product_id', productId)
    .order('position', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getProductSkinFit(productId: string): Promise<SkinFitResult[]> {
  const { data, error } = await supabase
    .from('skin_fit_results')
    .select('*')
    .eq('product_id', productId)
    .order('rank', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}
