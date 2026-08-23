/**
 * INCI ingredient lists are ordered by descending concentration, and by
 * regulation (US/EU/Canada labeling rules) that strict ordering is only
 * guaranteed for ingredients present at 1% or more — below that threshold,
 * brands can list ingredients in any order. So list position is an ordinal
 * proxy for concentration, never a measurement: no formulator discloses
 * exact percentages.
 *
 * Real formulations fall off far faster than linearly — a typical leave-on
 * product is majority water plus a handful of ingredients at percent-level
 * concentrations, then a long tail of sub-1% additives. An exponential
 * decay models that shape; a gentler curve does not, and the difference is
 * not academic. Measured against synthetic formulas spanning excellent to
 * poor, the previous hyperbolic curve (1/(1+0.15p)) gave the top 5
 * positions only 34% of total weight on a 30-ingredient list, letting
 * near-identical filler tails dominate and compressing every product into
 * a narrow 65-80 band regardless of quality. This curve puts ~59% on the
 * top 5 and widens that spread to 57-82, which is what makes the score
 * discriminate between products at all.
 *
 * The floor matters too: the tail is where fragrance allergens and trace
 * actives live, so weights decay toward a small floor rather than to zero.
 * Hazard that would otherwise be diluted away by averaging is handled
 * separately by the high-irritant cap in product-score.ts.
 */
const DECAY_RATE = 0.18
const WEIGHT_FLOOR = 0.02

export function positionWeight(position: number): number {
  return Math.max(WEIGHT_FLOOR, Math.exp(-position * DECAY_RATE))
}

/** Returns weights for `count` positions (0-indexed), normalized to sum to 1. */
export function normalizedPositionWeights(count: number): number[] {
  const raw = Array.from({ length: count }, (_, i) => positionWeight(i))
  const total = raw.reduce((sum, w) => sum + w, 0)
  if (total === 0) return raw
  return raw.map((w) => w / total)
}
