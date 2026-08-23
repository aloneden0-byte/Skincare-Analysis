import type { Ingredient } from '@/types'

/**
 * The skin concerns a user can select in Settings. Kept here (rather than
 * only in the Settings page) so the scoring engine and the UI can't drift
 * apart on what a concern is called.
 */
export type Concern =
  | 'acne'
  | 'sensitivity'
  | 'aging'
  | 'hyperpigmentation'
  | 'dehydration'
  | 'large-pores'

export const CONCERN_LABELS: Record<Concern, string> = {
  acne: 'אקנה ופצעונים',
  sensitivity: 'רגישות ואדמומיות',
  aging: 'סימני הזדקנות',
  hyperpigmentation: 'כתמים ואי-אחידות גוון',
  dehydration: 'התייבשות',
  'large-pores': 'נקבוביות מורחבות',
}

export const ALL_CONCERNS = Object.keys(CONCERN_LABELS) as Concern[]

/**
 * Which ingredients address which concern.
 *
 * Two independent signals feed this, deliberately:
 *
 * 1. Named actives, matched against the ingredient's canonical/INCI name and
 *    aliases. These are the ingredients with a real evidence base for a
 *    specific concern — the ones a dermatologist would actually name. A
 *    substring match is the right tool here because INCI names carry their
 *    own qualifiers ("Ascorbic Acid" vs "Sodium Ascorbyl Phosphate", "Retinol"
 *    vs "Retinyl Palmitate") and we want the family, not one exact spelling.
 *
 * 2. Functional category, as a much weaker fallback, so an unfamiliar
 *    humectant still registers as addressing dehydration even when it isn't
 *    in the named list. Categories are assigned by the enrichment agent for
 *    every researched ingredient, so this keeps coverage broad while the
 *    named list keeps precision high where it matters.
 *
 * Concentration is not something an INCI list ever discloses, so this
 * reports "the formula targets X", never "the formula will treat X" — the
 * position weighting applied by the caller is what keeps a trace of retinol
 * at the end of a label from being read as a real anti-aging treatment.
 */
const CONCERN_ACTIVES: Record<Concern, string[]> = {
  acne: [
    'salicylic acid',
    'benzoyl peroxide',
    'azelaic acid',
    'niacinamide',
    'zinc pca',
    'sulfur',
    'tea tree',
    'melaleuca',
    'adapalene',
    'retinoid',
    'retinal',
    'retinaldehyde',
    'succinic acid',
    'mandelic acid',
  ],
  sensitivity: [
    'centella',
    'madecassoside',
    'asiaticoside',
    'panthenol',
    'allantoin',
    'bisabolol',
    'oat',
    'avena',
    'colloidal oatmeal',
    'ceramide',
    'licorice',
    'glycyrrhiz',
    'green tea',
    'camellia sinensis',
    'aloe',
    'beta-glucan',
    'madecassic',
  ],
  aging: [
    'retinol',
    'retinal',
    'retinaldehyde',
    'retinyl',
    'tretinoin',
    'peptide',
    'matrixyl',
    'argireline',
    'acetyl hexapeptide',
    'palmitoyl',
    'coenzyme q10',
    'ubiquinone',
    'bakuchiol',
    'ascorbic acid',
    'ferulic acid',
    'growth factor',
    'adenosine',
  ],
  hyperpigmentation: [
    'ascorbic acid',
    'ascorbyl',
    'vitamin c',
    'niacinamide',
    'alpha arbutin',
    'arbutin',
    'kojic acid',
    'tranexamic acid',
    'azelaic acid',
    'licorice',
    'glycyrrhiz',
    'glycolic acid',
    'lactic acid',
    'hydroquinone',
    'thiamidol',
    'resorcinol',
  ],
  dehydration: [
    'hyaluronic acid',
    'sodium hyaluronate',
    'glycerin',
    'glycerol',
    'panthenol',
    'urea',
    'betaine',
    'trehalose',
    'sodium pca',
    'ceramide',
    'squalane',
    'polyglutamic acid',
    'butylene glycol',
    'propanediol',
    'honey',
    'beta-glucan',
  ],
  'large-pores': [
    'niacinamide',
    'salicylic acid',
    'glycolic acid',
    'lactic acid',
    'mandelic acid',
    'zinc pca',
    'retinol',
    'retinal',
    'clay',
    'kaolin',
    'bentonite',
    'charcoal',
  ],
}

/** Functional categories that broadly serve a concern, used when no named active matches. */
const CONCERN_CATEGORIES: Partial<Record<Concern, string[]>> = {
  dehydration: ['humectant', 'emollient', 'occlusive'],
  aging: ['peptide', 'active'],
  'large-pores': ['exfoliant'],
  acne: ['exfoliant'],
  hyperpigmentation: ['active'],
}

const NAMED_ACTIVE_STRENGTH = 1
const CATEGORY_FALLBACK_STRENGTH = 0.35

function searchableNames(ingredient: Ingredient): string {
  return [ingredient.canonical_name, ingredient.inci_name ?? '', ...(ingredient.aliases ?? [])]
    .join(' ')
    .toLowerCase()
}

/**
 * How strongly one ingredient addresses one concern, 0-1.
 * A named active scores full strength; a merely category-appropriate
 * ingredient scores a fraction of it.
 */
export function ingredientConcernStrength(ingredient: Ingredient, concern: Concern): number {
  const haystack = searchableNames(ingredient)
  if (CONCERN_ACTIVES[concern].some((active) => haystack.includes(active))) {
    return NAMED_ACTIVE_STRENGTH
  }
  if (CONCERN_CATEGORIES[concern]?.includes(ingredient.category)) {
    return CATEGORY_FALLBACK_STRENGTH
  }
  return 0
}
