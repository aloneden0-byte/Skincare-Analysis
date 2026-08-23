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

const NEUTRAL_FIT = 5 // out of 10 — "no particular reason for or against"
const TAG_BONUS = 5 // max lift for an ingredient explicitly suited to a tag
const BROAD_BONUS_FACTOR = 0.4 // an "all skin types" ingredient supports specific tags, but weakly
const RISK_WEIGHT = 1.1

/**
 * Only tags meaningfully above the neutral midpoint are worth showing. A
 * product that merely fails to offend anyone shouldn't claim to suit
 * anyone in particular — returning nothing is a legitimate, informative
 * answer here.
 */
const REPORT_THRESHOLD = 0.58
const TOP_N = 3

export interface SkinFitScore {
  tag: SkinTypeTag
  confidence: number // 0-1
}

/**
 * How much each risk axis counts against each skin type.
 *
 * This table exists to fix a structural bias in the previous
 * implementation, which subtracted a comedogenic penalty from
 * acne-prone/oily and an irritancy penalty from sensitive — but applied no
 * penalty whatsoever to dry, normal, combination, mature or all. Those
 * unpenalized tags therefore won essentially every ranking, and the three
 * tags that matter most to people with problem skin were pushed toward
 * zero and filtered out of the results entirely. The app could barely ever
 * tell an acne-prone or sensitive user that a product suited them.
 *
 * Every tag now carries a risk term, so no tag is structurally advantaged.
 * The weights differ because the underlying dermatology does: pore-clogging
 * is what matters for oily and acne-prone skin, barrier disruption is what
 * matters for sensitive skin, and dry and mature skin are penalized on
 * irritancy too, since the ingredients that sting a compromised barrier are
 * largely the same ones that strip it further. "Suits all skin types" is
 * held to the strictest standard of all — it has to offend nobody.
 */
const RISK_AXES: Record<SkinTypeTag, { comedogenic: number; irritancy: number }> = {
  'acne-prone': { comedogenic: 1, irritancy: 0.4 },
  oily: { comedogenic: 0.9, irritancy: 0.2 },
  sensitive: { comedogenic: 0.2, irritancy: 1 },
  dry: { comedogenic: 0.1, irritancy: 0.7 },
  mature: { comedogenic: 0.2, irritancy: 0.7 },
  combination: { comedogenic: 0.5, irritancy: 0.5 },
  normal: { comedogenic: 0.4, irritancy: 0.4 },
  all: { comedogenic: 0.8, irritancy: 0.8 },
}

/** Per-ingredient suitability for one skin type, on the same 0-10 scale as every other score. */
export function ingredientFitForTag(ingredient: Ingredient, tag: SkinTypeTag): number {
  const tags = ingredient.skin_type_fit ?? []
  const benefit = ingredient.benefit_score ?? 5
  const axis = RISK_AXES[tag]

  let fit = NEUTRAL_FIT
  if (tags.includes(tag)) {
    fit += (benefit / 10) * TAG_BONUS
  } else if (tag !== 'all' && tags.includes('all')) {
    fit += (benefit / 10) * TAG_BONUS * BROAD_BONUS_FACTOR
  }

  const risk =
    (ingredient.comedogenic_rating ?? 0) * axis.comedogenic +
    (ingredient.irritancy_rating ?? 0) * axis.irritancy
  fit -= risk * RISK_WEIGHT

  return clamp(fit, 0, 10)
}

/**
 * Ranks which skin types a product suits, as a position-weighted average of
 * per-ingredient suitability. Averaging (rather than summing) keeps every
 * tag on the same bounded 0-10 scale, so scores stay comparable between
 * tags and between products with different ingredient counts.
 */
export function computeSkinFit(ingredients: Ingredient[]): SkinFitScore[] {
  if (ingredients.length === 0) return []

  const weights = normalizedPositionWeights(ingredients.length)

  return ALL_TAGS.map((tag) => {
    const weighted = ingredients.reduce(
      (sum, ingredient, i) => sum + ingredientFitForTag(ingredient, tag) * weights[i],
      0,
    )
    return { tag, confidence: weighted / 10 }
  })
    .filter((r) => r.confidence >= REPORT_THRESHOLD)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, TOP_N)
}
