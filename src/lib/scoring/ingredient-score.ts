import type { Ingredient, ProductCategory } from '@/types'
import { getCategoryProfile } from './category-profile'

/**
 * A harmless ingredient (0 comedogenic, 0 irritancy) that simply isn't an
 * "active" — water, common solvents, plain emulsion stabilizers — should
 * read as unremarkable, not bad. benefit_score measures therapeutic value,
 * not safety, so it's scaled onto this baseline rather than used as the
 * entire base score; the highest-concentration ingredients (which dominate
 * the position-weighted average) are almost always exactly this kind of
 * carrier, so scoring them near-zero for "no active benefit" would drag
 * every real product down regardless of its formulation quality.
 */
export const SAFE_BASELINE = 6

/**
 * What a typical ingredient actually scores — the empirical mean of
 * ingredientBaseScore across the curated seed corpus (151 ingredients,
 * mean 6.93, median 7.20). Not a guess, and asserted against the real
 * corpus in scoring.test.ts so it can't silently drift as the database
 * grows.
 */
export const TYPICAL_INGREDIENT_SCORE = 6.9

/**
 * An ingredient we haven't researched yet is scored as an average
 * ingredient, so that researching it is score-neutral *in expectation*.
 *
 * This is the whole point, and it took two attempts to get right. It was
 * originally 5, then SAFE_BASELINE (6) — both below what a typical rated
 * ingredient scores, so both quietly broke score comparability in the same
 * direction. Every unmatched OCR token becomes an "unrated" placeholder
 * row, and OCR on a curved bottle produces plenty of those, so a freshly
 * scanned product was penalized for the scanner's own gaps and then
 * mechanically "improved" days later when the enrichment agent filled them
 * in, with nothing about the product having changed. Anchoring to the
 * corpus mean instead means an unknown ingredient neither flatters nor
 * punishes a product: enrichment moves a score only when the ingredient
 * turns out to be genuinely better or worse than average.
 *
 * Absence of evidence isn't evidence of harm, and it isn't evidence of
 * safety either — the uncertainty is reported separately as dataConfidence
 * (see product-score.ts), the same split EWG's Skin Deep makes between its
 * hazard score and its data-availability rating.
 */
const UNRATED_SCORE = TYPICAL_INGREDIENT_SCORE

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
    return UNRATED_SCORE
  }

  const { comedogenicWeight, irritancyWeight } = getCategoryProfile(category)
  const baseline = SAFE_BASELINE + (ingredient.benefit_score / 10) * (10 - SAFE_BASELINE)
  const comedogenicPenalty = (ingredient.comedogenic_rating ?? 0) * comedogenicWeight
  const irritancyPenalty = (ingredient.irritancy_rating ?? 0) * irritancyWeight

  return clamp(baseline - comedogenicPenalty - irritancyPenalty, 0, 10)
}
