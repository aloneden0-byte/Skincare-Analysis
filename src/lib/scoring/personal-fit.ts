import type { Ingredient, ProductCategory, SkinProfile, SkinTypeTag } from '@/types'
import { normalizedPositionWeights } from './position-weight'
import { ingredientBaseScore, clamp } from './ingredient-score'
import { ingredientFitForTag } from './skin-fit'
import { ALL_CONCERNS, CONCERN_LABELS, ingredientConcernStrength, type Concern } from './concerns'

/**
 * Concerns imply a skin type the picker itself doesn't offer. Settings only
 * asks for oily/dry/combination/normal, but someone who selects the "acne"
 * concern is telling us their skin is acne-prone just as directly as if
 * there were a button for it — and acne-prone, sensitive and mature are
 * exactly the tags that drive the comedogenic/irritancy risk axes. Bridging
 * the two lets the profile the user already filled in do real work without
 * making them answer the same question twice.
 */
const CONCERN_IMPLIES_TAG: Partial<Record<Concern, SkinTypeTag>> = {
  acne: 'acne-prone',
  sensitivity: 'sensitive',
  aging: 'mature',
}

// A personal score is still mostly a judgement about the product; personal
// factors shift it rather than replace it. Otherwise a poorly formulated
// product could score well simply for containing one ingredient aimed at
// the user's concern.
const QUALITY_WEIGHT = 0.5
const SKIN_TYPE_WEIGHT = 0.3
const CONCERN_WEIGHT = 0.2

/** Irritancy at which a self-identified sensitive user gets an explicit warning. */
const SENSITIVE_ALERT_IRRITANCY = 3
const COMEDOGENIC_ALERT = 3
/** Only ingredients in this many leading INCI positions can raise a personal alert. */
const ALERT_POSITION_CUTOFF = 8

export interface PersonalFactor {
  kind: 'positive' | 'negative'
  ingredientName: string
  detail: string
}

export interface PersonalFitResult {
  /** 0-100, or null when the user hasn't filled in a skin profile yet. */
  score: number | null
  factors: PersonalFactor[]
  /** Concerns the formula actively targets, ranked by how strongly. */
  matchedConcerns: Concern[]
}

function effectiveTags(profile: SkinProfile): SkinTypeTag[] {
  const tags: SkinTypeTag[] = []
  if (profile.skin_type) tags.push(profile.skin_type as SkinTypeTag)
  for (const concern of profile.concerns ?? []) {
    const implied = CONCERN_IMPLIES_TAG[concern as Concern]
    if (implied && !tags.includes(implied)) tags.push(implied)
  }
  return tags
}

function userConcerns(profile: SkinProfile): Concern[] {
  return (profile.concerns ?? []).filter((c): c is Concern => ALL_CONCERNS.includes(c as Concern))
}

/**
 * Scores a product for one specific person rather than in the abstract.
 *
 * The app collects a skin type and a set of concerns in Settings, but until
 * now nothing read them back — every user saw the same global number, which
 * made the profile form decorative. This blends three things the user
 * actually cares about: is the product well formulated at all, does it suit
 * their skin type, and does it target what they're trying to treat.
 */
export function computePersonalFit(
  ingredients: Ingredient[],
  category: ProductCategory,
  profile: SkinProfile | null,
): PersonalFitResult {
  const tags = profile ? effectiveTags(profile) : []
  const concerns = profile ? userConcerns(profile) : []

  if (!profile || (tags.length === 0 && concerns.length === 0) || ingredients.length === 0) {
    return { score: null, factors: [], matchedConcerns: [] }
  }

  const weights = normalizedPositionWeights(ingredients.length)

  const quality = ingredients.reduce(
    (sum, ing, i) => sum + ingredientBaseScore(ing, category) * weights[i],
    0,
  )

  // Averaged across the user's tags: someone who is both oily and sensitive
  // needs a product that works for both, not one that wins on either alone.
  const skinTypeFit =
    tags.length === 0
      ? quality
      : tags.reduce((tagSum, tag) => {
          const perTag = ingredients.reduce(
            (sum, ing, i) => sum + ingredientFitForTag(ing, tag) * weights[i],
            0,
          )
          return tagSum + perTag
        }, 0) / tags.length

  // Concern coverage is capped per concern: a formula with three
  // pigment-fading actives isn't three times better at it than one with a
  // single well-placed active, and treating it that way would reward
  // kitchen-sink formulations.
  const concernScores = concerns.map((concern) => {
    const covered = ingredients.reduce(
      (sum, ing, i) => sum + ingredientConcernStrength(ing, concern) * weights[i],
      0,
    )
    return { concern, covered: Math.min(1, covered * 4) }
  })
  const concernCoverage =
    concernScores.length === 0
      ? quality / 10
      : concernScores.reduce((s, c) => s + c.covered, 0) / concernScores.length

  const blended =
    quality * QUALITY_WEIGHT +
    skinTypeFit * (tags.length > 0 ? SKIN_TYPE_WEIGHT : 0) +
    concernCoverage * 10 * (concerns.length > 0 ? CONCERN_WEIGHT : 0)
  const activeWeight =
    QUALITY_WEIGHT +
    (tags.length > 0 ? SKIN_TYPE_WEIGHT : 0) +
    (concerns.length > 0 ? CONCERN_WEIGHT : 0)

  const score = Math.round(clamp((blended / activeWeight / 10) * 100, 0, 100))

  return {
    score,
    factors: personalFactors(ingredients, tags, concerns),
    matchedConcerns: concernScores
      .filter((c) => c.covered > 0.15)
      .sort((a, b) => b.covered - a.covered)
      .map((c) => c.concern),
  }
}

/**
 * The handful of ingredients that most explain this person's score, so the
 * number is auditable rather than something the app just asserts.
 */
function personalFactors(
  ingredients: Ingredient[],
  tags: SkinTypeTag[],
  concerns: Concern[],
): PersonalFactor[] {
  const factors: PersonalFactor[] = []
  const leading = ingredients.slice(0, ALERT_POSITION_CUTOFF)

  if (tags.includes('acne-prone') || tags.includes('oily')) {
    for (const ing of leading) {
      if ((ing.comedogenic_rating ?? 0) >= COMEDOGENIC_ALERT) {
        factors.push({
          kind: 'negative',
          ingredientName: ing.canonical_name,
          detail: 'עלול לסתום נקבוביות — רלוונטי לעור שמן או נוטה לאקנה',
        })
      }
    }
  }

  if (tags.includes('sensitive')) {
    for (const ing of leading) {
      if ((ing.irritancy_rating ?? 0) >= SENSITIVE_ALERT_IRRITANCY) {
        factors.push({
          kind: 'negative',
          ingredientName: ing.canonical_name,
          detail: 'בעל פוטנציאל גירוי — רלוונטי לעור רגיש',
        })
      }
    }
  }

  for (const concern of concerns) {
    const hit = leading.find((ing) => ingredientConcernStrength(ing, concern) === 1)
    if (hit) {
      factors.push({
        kind: 'positive',
        ingredientName: hit.canonical_name,
        detail: `מטפל ב${CONCERN_LABELS[concern]}`,
      })
    }
  }

  return factors.slice(0, 6)
}
