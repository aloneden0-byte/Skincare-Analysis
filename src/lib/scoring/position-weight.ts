/**
 * INCI ingredient lists are ordered by descending concentration. Earlier
 * positions should dominate the score, but the tail still counts a little
 * (a trace active or an allergen can still matter), so we use a decay curve
 * with a floor rather than dropping to zero.
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
