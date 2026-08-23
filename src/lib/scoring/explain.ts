import type { Ingredient, ProductCategory } from '@/types'
import { normalizedPositionWeights } from './position-weight'
import { ingredientBaseScore, TYPICAL_INGREDIENT_SCORE } from './ingredient-score'

export interface ScoreContribution {
  ingredientName: string
  /** Points of the final 0-100 score this ingredient added (positive) or removed (negative). */
  impact: number
  reason: string
}

export interface ScoreExplanation {
  helping: ScoreContribution[]
  hurting: ScoreContribution[]
}

/** Contributions smaller than this are rounding noise, not an explanation. */
const MIN_REPORTABLE_IMPACT = 0.5

/**
 * How far an ingredient's own score must sit from typical, on the 0-10
 * scale, before it's worth naming at all.
 *
 * This gate is separate from MIN_REPORTABLE_IMPACT on purpose. Impact
 * combines an ingredient's quality with its concentration weight, so a
 * barely-above-average ingredient in the first INCI position clears any
 * impact threshold on weight alone — which is how water, a hair above the
 * corpus mean because that mean includes irritants, kept getting reported
 * as a top reason a product scored well. Requiring a full point of
 * difference means the explanation names only ingredients that are
 * genuinely better or worse than an ordinary one.
 */
const MIN_NOTABLE_DELTA = 1
const TOP_N = 3

function reasonFor(ingredient: Ingredient): string {
  if (!ingredient.is_rated || ingredient.benefit_score == null) return 'עדיין לא נחקר'

  const comedogenic = ingredient.comedogenic_rating ?? 0
  const irritancy = ingredient.irritancy_rating ?? 0

  if (irritancy >= 3 && comedogenic >= 3) return 'פוטנציאל גירוי וסתימת נקבוביות'
  if (irritancy >= 3) return 'פוטנציאל גירוי'
  if (comedogenic >= 3) return 'עלול לסתום נקבוביות'
  if (ingredient.benefit_score >= 8) return 'רכיב פעיל בעל תועלת מוכחת'
  if (ingredient.benefit_score >= 6) return 'רכיב מיטיב'
  return 'תועלת מוגבלת'
}

/**
 * Attributes the final score back to the individual ingredients that moved
 * it, so the number is auditable instead of asserted.
 *
 * Impact is measured against what a *typical* ingredient scores, not
 * against zero and not against the harmless floor. The question a user is
 * asking here is "what makes this product different from an ordinary one",
 * and only an ingredient that beats or trails the average answers it.
 * Measuring from the harmless floor instead made every non-risky
 * ingredient look like a positive contributor — water was reported as one
 * of the top three reasons a product scored well, on every product that
 * contains water, which is nearly all of them.
 */
export function explainScore(
  ingredients: Ingredient[],
  category: ProductCategory,
): ScoreExplanation {
  if (ingredients.length === 0) return { helping: [], hurting: [] }

  const weights = normalizedPositionWeights(ingredients.length)

  const contributions: ScoreContribution[] = ingredients
    .map((ingredient, i) => ({
      ingredient,
      delta: ingredientBaseScore(ingredient, category) - TYPICAL_INGREDIENT_SCORE,
      weight: weights[i],
    }))
    .filter(({ delta }) => Math.abs(delta) >= MIN_NOTABLE_DELTA)
    .map(({ ingredient, delta, weight }) => ({
      ingredientName: ingredient.canonical_name,
      impact: delta * weight * 10,
      reason: reasonFor(ingredient),
    }))

  return {
    helping: contributions
      .filter((c) => c.impact >= MIN_REPORTABLE_IMPACT)
      .sort((a, b) => b.impact - a.impact)
      .slice(0, TOP_N),
    hurting: contributions
      .filter((c) => c.impact <= -MIN_REPORTABLE_IMPACT)
      .sort((a, b) => a.impact - b.impact)
      .slice(0, TOP_N),
  }
}
