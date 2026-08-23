import { describe, expect, it } from 'vitest'
import type { Ingredient, Product, SkinProfile } from '@/types'
import { normalizedPositionWeights } from './position-weight'
import { ingredientBaseScore, SAFE_BASELINE, TYPICAL_INGREDIENT_SCORE } from './ingredient-score'
import { computeOverallScore } from './product-score'
import { computeSkinFit, ingredientFitForTag } from './skin-fit'
import { computePersonalFit } from './personal-fit'
import { explainScore } from './explain'
import { analyzeRoutine, productActiveClasses } from './routine-analysis'
import { INGREDIENTS_SEED } from '../../../supabase/seed/ingredients-seed'

/** Minimal Ingredient factory — only the fields the scoring engine reads. */
function ing(over: Partial<Ingredient> & { canonical_name: string }): Ingredient {
  return {
    id: over.canonical_name,
    inci_name: null,
    aliases: [],
    category: 'other',
    comedogenic_rating: 0,
    irritancy_rating: 0,
    benefit_score: 5,
    skin_type_fit: [],
    description: null,
    is_rated: true,
    source: 'seed',
    created_at: '',
    updated_at: '',
    ...over,
  } as Ingredient
}

const water = ing({ canonical_name: 'Water', benefit_score: 3, category: 'solvent' })
const glycerin = ing({
  canonical_name: 'Glycerin',
  benefit_score: 8,
  category: 'humectant',
  skin_type_fit: ['dry', 'sensitive', 'all'],
})
const niacinamide = ing({
  canonical_name: 'Niacinamide',
  benefit_score: 9,
  category: 'active',
  skin_type_fit: ['oily', 'acne-prone', 'all'],
})
const fragrance = ing({
  canonical_name: 'Fragrance',
  benefit_score: 0,
  irritancy_rating: 5,
  category: 'fragrance',
})
const heavyOil = ing({
  canonical_name: 'Coconut Oil',
  benefit_score: 4,
  comedogenic_rating: 4,
  category: 'emollient',
})
const filler = (n: number) =>
  Array.from({ length: n }, (_, i) => ing({ canonical_name: `Filler ${i}`, benefit_score: 4 }))

describe('position weights', () => {
  it('normalizes to 1', () => {
    const w = normalizedPositionWeights(20)
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10)
  })

  it('decays monotonically so earlier INCI positions dominate', () => {
    const w = normalizedPositionWeights(20)
    for (let i = 1; i < w.length; i++) expect(w[i]).toBeLessThan(w[i - 1])
  })

  it('gives the top 5 positions the majority of the weight on a long list', () => {
    const w = normalizedPositionWeights(30)
    const top5 = w.slice(0, 5).reduce((a, b) => a + b, 0)
    expect(top5).toBeGreaterThan(0.5)
  })
})

describe('ingredient base score', () => {
  it('scores an unresearched ingredient as an average one, so enrichment is score-neutral', () => {
    // Regression, twice over: unrated scored 5, then 6 (the harmless floor) —
    // both below what a typical rated ingredient scores, so enriching an
    // ingredient mechanically raised product scores with nothing about the
    // product having changed.
    const unknown = ing({ canonical_name: 'Mystery', is_rated: false, benefit_score: null })
    expect(ingredientBaseScore(unknown, 'serum')).toBe(TYPICAL_INGREDIENT_SCORE)
    expect(TYPICAL_INGREDIENT_SCORE).toBeGreaterThan(SAFE_BASELINE)
  })

  it('keeps TYPICAL_INGREDIENT_SCORE aligned with the real ingredient corpus', () => {
    // The constant is an empirical mean, so it has to be checked against the
    // corpus it claims to summarize rather than trusted indefinitely.
    const corpusScores = INGREDIENTS_SEED.map((seed) =>
      ingredientBaseScore(
        ing({
          canonical_name: seed.canonical_name,
          benefit_score: seed.benefit_score ?? 0,
          comedogenic_rating: seed.comedogenic_rating ?? 0,
          irritancy_rating: seed.irritancy_rating ?? 0,
        }),
        'serum',
      ),
    )
    const mean = corpusScores.reduce((a, b) => a + b, 0) / corpusScores.length
    expect(mean).toBeCloseTo(TYPICAL_INGREDIENT_SCORE, 0)
  })

  it('rewards benefit and penalizes risk', () => {
    expect(ingredientBaseScore(niacinamide, 'serum')).toBeGreaterThan(
      ingredientBaseScore(water, 'serum'),
    )
    expect(ingredientBaseScore(fragrance, 'serum')).toBeLessThan(SAFE_BASELINE)
  })

  it('penalizes risk less in rinse-off products than leave-on ones', () => {
    expect(ingredientBaseScore(heavyOil, 'cleanser')).toBeGreaterThan(
      ingredientBaseScore(heavyOil, 'moisturizer'),
    )
  })
})

describe('overall score', () => {
  it('separates a well-formulated product from a poorly-formulated one', () => {
    const good = [water, glycerin, niacinamide, ...filler(15)]
    const bad = [water, fragrance, heavyOil, ...filler(15)]
    const goodScore = computeOverallScore(good, 'serum').overallScore
    const badScore = computeOverallScore(bad, 'serum').overallScore
    expect(goodScore - badScore).toBeGreaterThan(15)
  })

  it('caps the score when a high irritant sits high in a leave-on formula', () => {
    const withIrritant = computeOverallScore([water, fragrance, glycerin, niacinamide], 'serum')
    expect(withIrritant.highIrritantWarning).toBe(true)
    expect(withIrritant.overallScore).toBeLessThanOrEqual(65)
  })

  it('does not cap on a rinse-off product', () => {
    expect(computeOverallScore([water, fragrance], 'cleanser').highIrritantWarning).toBe(false)
  })

  it('reports data confidence reflecting how much of the formula is researched', () => {
    const unknown = ing({ canonical_name: 'Mystery', is_rated: false, benefit_score: null })
    expect(computeOverallScore([water, glycerin], 'serum').dataConfidence).toBeCloseTo(1, 5)
    expect(computeOverallScore([unknown, unknown], 'serum').dataConfidence).toBeCloseTo(0, 5)
  })
})

describe('skin fit', () => {
  it('can recommend acne-prone and oily skin for a gentle non-comedogenic formula', () => {
    // Regression: penalties used to apply only to acne-prone/oily/sensitive
    // while dry/normal/mature got none, so those tags never surfaced.
    const tags = computeSkinFit([niacinamide, glycerin, water]).map((t) => t.tag)
    expect(tags).toContain('acne-prone')
  })

  it('does not recommend acne-prone skin for a comedogenic formula', () => {
    const tags = computeSkinFit([heavyOil, heavyOil, water]).map((t) => t.tag)
    expect(tags).not.toContain('acne-prone')
  })

  it('does not recommend sensitive skin for an irritating formula', () => {
    const tags = computeSkinFit([fragrance, fragrance, water]).map((t) => t.tag)
    expect(tags).not.toContain('sensitive')
  })

  it('returns nothing rather than inventing a match for an unremarkable formula', () => {
    expect(computeSkinFit([water, water, water])).toEqual([])
  })

  it('exempts no skin type from risk', () => {
    // Regression: dry/normal/combination/mature previously carried no risk
    // term at all, so they floated above the tags that did and won every
    // ranking. Every tag must respond to a risky ingredient.
    const risky = ing({
      canonical_name: 'Risky',
      benefit_score: 5,
      comedogenic_rating: 4,
      irritancy_rating: 4,
    })
    for (const tag of ['dry', 'normal', 'combination', 'mature', 'acne-prone', 'sensitive'] as const) {
      expect(
        ingredientFitForTag(risky, tag),
        `${tag} should be penalized by a comedogenic + irritating ingredient`,
      ).toBeLessThan(ingredientFitForTag(ing({ canonical_name: 'Safe', benefit_score: 5 }), tag))
    }
  })
})

describe('personal fit', () => {
  const profile = (over: Partial<SkinProfile>): SkinProfile =>
    ({ id: 'p', user_id: 'u', skin_type: null, concerns: [], ...over }) as SkinProfile

  it('returns null when the user has no profile', () => {
    expect(computePersonalFit([water, glycerin], 'serum', null).score).toBeNull()
    expect(computePersonalFit([water, glycerin], 'serum', profile({})).score).toBeNull()
  })

  it('scores a niacinamide serum higher for acne-prone skin than a heavy oil', () => {
    const acne = profile({ skin_type: 'oily', concerns: ['acne'] })
    const good = computePersonalFit([niacinamide, glycerin, water], 'serum', acne).score!
    const bad = computePersonalFit([heavyOil, water, water], 'serum', acne).score!
    expect(good).toBeGreaterThan(bad)
  })

  it('identifies which of the user concerns the formula targets', () => {
    const result = computePersonalFit(
      [niacinamide, glycerin, water],
      'serum',
      profile({ skin_type: 'oily', concerns: ['acne', 'dehydration'] }),
    )
    expect(result.matchedConcerns).toContain('acne')
    expect(result.matchedConcerns).toContain('dehydration')
  })

  it('warns a sensitive user about a leading irritant', () => {
    const result = computePersonalFit(
      [water, fragrance],
      'serum',
      profile({ skin_type: 'dry', concerns: ['sensitivity'] }),
    )
    expect(result.factors.some((f) => f.kind === 'negative' && f.ingredientName === 'Fragrance')).toBe(
      true,
    )
  })

  it('differs from the global score once a profile is present', () => {
    const oily = profile({ skin_type: 'oily', concerns: ['acne'] })
    const ings = [heavyOil, water, water]
    const global = computeOverallScore(ings, 'moisturizer').overallScore
    const personal = computePersonalFit(ings, 'moisturizer', oily).score!
    expect(personal).toBeLessThan(global)
  })
})

describe('score explanation', () => {
  it('names the ingredients that helped and hurt', () => {
    const { helping, hurting } = explainScore([water, niacinamide, fragrance], 'serum')
    expect(helping[0].ingredientName).toBe('Niacinamide')
    expect(hurting[0].ingredientName).toBe('Fragrance')
  })

  it('does not report a plain carrier like water as a reason the product scored well', () => {
    // Regression: impact was measured from the harmless floor, so every
    // non-risky ingredient looked positive and water ranked as a top
    // contributor on essentially every product.
    const { helping } = explainScore([water, niacinamide, fragrance], 'serum')
    expect(helping.map((h) => h.ingredientName)).not.toContain('Water')
  })
})

describe('routine analysis', () => {
  const product = (name: string, category: Product['category'] = 'serum'): Product =>
    ({ id: name, name, category, overall_score: 70 }) as Product

  const retinolSerum = {
    product: product('Retinol Serum'),
    ingredients: [water, ing({ canonical_name: 'Retinol', benefit_score: 9, category: 'active' })],
  }
  const ahaToner = {
    product: product('AHA Toner', 'exfoliant'),
    ingredients: [water, ing({ canonical_name: 'Glycolic Acid', benefit_score: 7, category: 'exfoliant' })],
  }
  const vitCSerum = {
    product: product('Vitamin C Serum'),
    ingredients: [water, ing({ canonical_name: 'Ascorbic Acid', benefit_score: 9, category: 'active' })],
  }
  const sunscreen = { product: product('SPF 50', 'sunscreen'), ingredients: [water, glycerin] }
  const plainMoisturizer = { product: product('Moisturizer', 'moisturizer'), ingredients: [water, glycerin] }

  it('detects active classes by ingredient family', () => {
    expect(productActiveClasses(retinolSerum).has('retinoid')).toBe(true)
    expect(productActiveClasses(ahaToner).has('aha')).toBe(true)
    expect(productActiveClasses(vitCSerum).has('vitamin-c')).toBe(true)
  })

  it('ignores citric acid present only as a trace pH adjuster', () => {
    const entry = {
      product: product('Lotion', 'moisturizer'),
      ingredients: [...filler(25), ing({ canonical_name: 'Citric Acid', category: 'exfoliant' })],
    }
    expect(productActiveClasses(entry).has('aha')).toBe(false)
  })

  it('flags a retinoid layered with an exfoliating acid', () => {
    const findings = analyzeRoutine('evening', [retinolSerum, ahaToner])
    expect(findings.some((f) => f.severity === 'high' && f.title.includes('רטינואיד'))).toBe(true)
  })

  it('flags a retinoid layered with vitamin C', () => {
    const findings = analyzeRoutine('evening', [retinolSerum, vitCSerum])
    expect(findings.some((f) => f.title.includes('ויטמין C'))).toBe(true)
  })

  it('does not flag vitamin C with niacinamide, which current evidence supports', () => {
    const niacinamideSerum = { product: product('Niacinamide Serum'), ingredients: [water, niacinamide] }
    const findings = analyzeRoutine('evening', [vitCSerum, niacinamideSerum])
    expect(findings).toEqual([])
  })

  it('flags a morning routine with no sunscreen, more urgently alongside a retinoid', () => {
    const plain = analyzeRoutine('morning', [plainMoisturizer])
    expect(plain.find((f) => f.title.includes('קרם הגנה'))?.severity).toBe('medium')

    const withRetinoid = analyzeRoutine('morning', [retinolSerum, plainMoisturizer])
    expect(withRetinoid.find((f) => f.title.includes('קרם הגנה'))?.severity).toBe('high')
  })

  it('does not flag sunscreen when the morning routine already has one', () => {
    const findings = analyzeRoutine('morning', [plainMoisturizer, sunscreen])
    expect(findings.some((f) => f.title.includes('קרם הגנה'))).toBe(false)
  })

  it('finds nothing wrong with a sensible routine', () => {
    expect(analyzeRoutine('evening', [plainMoisturizer])).toEqual([])
  })
})
