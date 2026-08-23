/**
 * INCI ingredient lists are ordered by descending concentration, and by
 * regulation (US/EU/Canada labeling rules) that strict ordering is only
 * guaranteed for ingredients present at 1% or more — below that threshold,
 * brands can list ingredients in any order. In practice that 1% cutoff
 * tends to land somewhere past the first dozen or so ingredients on a
 * typical label, which is why position weight needs to decay toward (not
 * to) a small floor rather than either staying flat or dropping to zero:
 * earlier positions should dominate the score since that's where real
 * concentration differences are reliably ordered, but the tail still
 * counts a little (a trace active or an allergen can still matter, and its
 * exact rank there isn't meaningful anyway). No formulator discloses exact
 * percentages, so this ordinal decay is a proxy for concentration, not a
 * measurement — the same practical compromise used by public INCI decoder
 * tools that estimate concentration from list position.
 */
const DECAY_RATE = 0.15
const WEIGHT_FLOOR = 0.05

export function positionWeight(position: number): number {
  return Math.max(WEIGHT_FLOOR, 1 / (1 + position * DECAY_RATE))
}

/** Returns weights for `count` positions (0-indexed), normalized to sum to 1. */
export function normalizedPositionWeights(count: number): number[] {
  const raw = Array.from({ length: count }, (_, i) => positionWeight(i))
  const total = raw.reduce((sum, w) => sum + w, 0)
  if (total === 0) return raw
  return raw.map((w) => w / total)
}
