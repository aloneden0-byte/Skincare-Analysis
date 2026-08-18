import type { Ingredient, ProductCategory } from '@/types'
import { ingredientBaseScore } from './ingredient-score'
import { normalizedPositionWeights } from './position-weight'
import { getCategoryProfile } from './category-profile'

const HIGH_IRRITANCY_THRESHOLD = 4
const HIGH_IRRITANCY_POSITION_CUTOFF = 5

export interface OverallScoreResult {
  overallScore: number
  highIrritantWarning: boolean
}

/**
 * Aggregates ordered ingredients (index 0 = highest concentration per INCI
 * convention) into a single 0-100 product score, plus a separate flag for a
 * potentially irritating ingredient sitting at a high concentration in a
 * leave-on product (kept separate from the number so the UI can explain why).
 */
export function computeOverallScore(
  ingredients: Ingredient[],
  category: ProductCategory,
): OverallScoreResult {
  if (ingredients.length === 0) {
    return { overallScore: 50, highIrritantWarning: false }
  }

  const weights = normalizedPositionWeights(ingredients.length)
  const weightedSum = ingredients.reduce(
    (sum, ingredient, i) => sum + ingredientBaseScore(ingredient, category) * weights[i],
    0,
  )
  const overallScore = Math.round((weightedSum / 10) * 100)

  const { irritancyWeight } = getCategoryProfile(category)
  const highIrritantWarning =
    irritancyWeight >= 1 &&
    ingredients
      .slice(0, HIGH_IRRITANCY_POSITION_CUTOFF)
      .some((ing) => (ing.irritancy_rating ?? 0) >= HIGH_IRRITANCY_THRESHOLD)

  return { overallScore, highIrritantWarning }
}
