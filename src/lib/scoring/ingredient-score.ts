import type { Ingredient, ProductCategory } from '@/types'
import { getCategoryProfile } from './category-profile'

const NEUTRAL_SCORE = 5 // out of 10, used for unrated/placeholder ingredients

// A harmless ingredient (0 comedogenic, 0 irritancy) that simply isn't an
// "active" — water, common solvents, plain emulsion stabilizers — should
// read as unremarkable, not bad. benefit_score alone measures therapeutic
// value, not safety, so it's scaled onto this baseline rather than used as
// the entire base score; the highest-concentration ingredients (which
// dominate the position-weighted average below) are almost always exactly
// this kind of carrier, so scoring them near-zero for "no active benefit"
// previously dragged nearly every real product's score down regardless of
// its actual formulation quality.
const SAFE_BASELINE = 6

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Base 0-10 quality score for a single ingredient, dampened by the
 * product's category (rinse-off products care less about comedogenic/
 * irritancy penalties than leave-on products do).
 *
 * comedogenic_rating and irritancy_rating are 0-5 scales in the tradition
 * of the Fulton/Kligman comedogenicity scale — the closest thing this
 * field has to a standard, but a genuinely imperfect one: it was derived
 * from ingredients tested near 100% concentration on rabbit-ear skin
 * (more reactive than human facial skin), so ratings run conservative
 * relative to how an ingredient behaves diluted into a real formula. We
 * don't have per-ingredient real-world concentration data to correct for
 * that directly, so the correction is structural instead: these ratings
 * only ever apply at the position-weighted strength computed in
 * product-score.ts, so a rated-as-comedogenic ingredient buried at the
 * tail of a long INCI list (i.e. actually present at trace amounts)
 * barely moves the final number, the same way its real-world risk would
 * scale down at that concentration.
 */
export function ingredientBaseScore(ingredient: Ingredient, category: ProductCategory): number {
  if (!ingredient.is_rated || ingredient.benefit_score == null) {
    return NEUTRAL_SCORE
  }

  const { comedogenicWeight, irritancyWeight } = getCategoryProfile(category)
  const baseline = SAFE_BASELINE + (ingredient.benefit_score / 10) * (10 - SAFE_BASELINE)
  const comedogenicPenalty = (ingredient.comedogenic_rating ?? 0) * comedogenicWeight
  const irritancyPenalty = (ingredient.irritancy_rating ?? 0) * irritancyWeight

  return clamp(baseline - comedogenicPenalty - irritancyPenalty, 0, 10)
}
