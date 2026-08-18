import type { Ingredient, ProductCategory } from '@/types'
import { getCategoryProfile } from './category-profile'

const NEUTRAL_SCORE = 5 // out of 10, used for unrated/placeholder ingredients

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Base 0-10 quality score for a single ingredient, dampened by the
 * product's category (rinse-off products care less about comedogenic/
 * irritancy penalties than leave-on products do).
 */
export function ingredientBaseScore(ingredient: Ingredient, category: ProductCategory): number {
  if (!ingredient.is_rated || ingredient.benefit_score == null) {
    return NEUTRAL_SCORE
  }

  const { comedogenicWeight, irritancyWeight } = getCategoryProfile(category)
  const comedogenicPenalty = (ingredient.comedogenic_rating ?? 0) * comedogenicWeight
  const irritancyPenalty = (ingredient.irritancy_rating ?? 0) * irritancyWeight

  return clamp(ingredient.benefit_score - comedogenicPenalty - irritancyPenalty, 0, 10)
}
