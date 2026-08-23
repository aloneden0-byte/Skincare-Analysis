import type { Ingredient, ProductCategory } from '@/types'
import { ingredientBaseScore } from './ingredient-score'
import { normalizedPositionWeights } from './position-weight'
import { getCategoryProfile } from './category-profile'

const HIGH_IRRITANCY_THRESHOLD = 4
const HIGH_IRRITANCY_POSITION_CUTOFF = 5

// Consumer ingredient scanners with a real safety framing (EWG Skin Deep,
// Yuka) deliberately don't score as a plain average of ingredient scores —
// Yuka's own methodology caps a product's score once a sufficiently risky
// ingredient is present, rather than letting a weighted average dilute it
// away; EWG's hazard score is likewise a weight-of-evidence verdict, not an
// average. The reasoning carries over here: someone who reacts to one
// well-evidenced irritant doesn't care how good the rest of the formula is,
// so a high-irritancy ingredient at meaningful concentration (top 5 INCI
// positions) caps the score instead of just being outvoted by everything
// else.
const HIGH_IRRITANT_SCORE_CAP = 65

export interface OverallScoreResult {
  overallScore: number
  highIrritantWarning: boolean
  /**
   * 0-1: the position-weighted share of this product's ingredients backed
   * by real research, vs. still-unrated placeholders (which score as a
   * cautious neutral — see ingredient-score.ts). EWG's Skin Deep publishes
   * a comparable "data availability" rating alongside its hazard score for
   * the same reason: a score built mostly from unknowns shouldn't be shown
   * with the same confidence as one backed by real ingredient data.
   */
  dataConfidence: number
}

/**
 * Aggregates ordered ingredients (index 0 = highest concentration per INCI
 * convention) into a single 0-100 product score, plus a separate flag for a
 * potentially irritating ingredient sitting at a high concentration in a
 * leave-on product (kept separate from the number so the UI can explain why,
 * and folded into the cap below).
 */
export function computeOverallScore(
  ingredients: Ingredient[],
  category: ProductCategory,
): OverallScoreResult {
  if (ingredients.length === 0) {
    return { overallScore: 50, highIrritantWarning: false, dataConfidence: 0 }
  }

  const weights = normalizedPositionWeights(ingredients.length)
  const weightedSum = ingredients.reduce(
    (sum, ingredient, i) => sum + ingredientBaseScore(ingredient, category) * weights[i],
    0,
  )
  const dataConfidence = ingredients.reduce(
    (sum, ingredient, i) => sum + (ingredient.is_rated ? weights[i] : 0),
    0,
  )

  const { irritancyWeight } = getCategoryProfile(category)
  const highIrritantWarning =
    irritancyWeight >= 1 &&
    ingredients
      .slice(0, HIGH_IRRITANCY_POSITION_CUTOFF)
      .some((ing) => (ing.irritancy_rating ?? 0) >= HIGH_IRRITANCY_THRESHOLD)

  const rawScore = Math.round((weightedSum / 10) * 100)
  const overallScore = highIrritantWarning ? Math.min(rawScore, HIGH_IRRITANT_SCORE_CAP) : rawScore

  return { overallScore, highIrritantWarning, dataConfidence: Math.round(dataConfidence * 100) / 100 }
}
