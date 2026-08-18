import type { Ingredient, SkinTypeTag } from '@/types'
import { normalizedPositionWeights } from './position-weight'
import { clamp } from './ingredient-score'

const ALL_TAGS: SkinTypeTag[] = [
  'oily',
  'dry',
  'combination',
  'normal',
  'acne-prone',
  'sensitive',
  'mature',
  'all',
]

// Tags where a high comedogenic/irritancy rating counts against the tag even
// for ingredients that aren't explicitly labeled with it — e.g. a heavy
// occlusive doesn't need an "acne-prone: bad" tag to still be a bad idea for
// acne-prone skin.
const COMEDOGENIC_SENSITIVE_TAGS: SkinTypeTag[] = ['acne-prone', 'oily']
const IRRITANCY_SENSITIVE_TAGS: SkinTypeTag[] = ['sensitive']
const CONFLICT_PENALTY_FACTOR = 0.6

const TOP_N = 3

export interface SkinFitScore {
  tag: SkinTypeTag
  confidence: number // 0-1
}

/**
 * Aggregates ingredient skin-type-fit tags (weighted by INCI position and
 * benefit score) into a ranked list of the best-fitting skin types, with a
 * static conflict rule so comedogenic/irritating ingredients count against
 * acne-prone/sensitive skin even when not explicitly tagged.
 */
export function computeSkinFit(ingredients: Ingredient[]): SkinFitScore[] {
  if (ingredients.length === 0) return []

  const weights = normalizedPositionWeights(ingredients.length)
  const rawScores = new Map<SkinTypeTag, number>()

  for (const tag of ALL_TAGS) {
    let score = 0
    ingredients.forEach((ingredient, i) => {
      const weight = weights[i]
      const benefit = ingredient.benefit_score ?? 5
      if (ingredient.skin_type_fit.includes(tag)) {
        score += weight * benefit
      }
      if (COMEDOGENIC_SENSITIVE_TAGS.includes(tag)) {
        score -= weight * (ingredient.comedogenic_rating ?? 0) * CONFLICT_PENALTY_FACTOR
      }
      if (IRRITANCY_SENSITIVE_TAGS.includes(tag)) {
        score -= weight * (ingredient.irritancy_rating ?? 0) * CONFLICT_PENALTY_FACTOR
      }
    })
    rawScores.set(tag, clamp(score, 0, 10))
  }

  return Array.from(rawScores.entries())
    .map(([tag, score]) => ({ tag, confidence: score / 10 }))
    .filter((r) => r.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, TOP_N)
}
