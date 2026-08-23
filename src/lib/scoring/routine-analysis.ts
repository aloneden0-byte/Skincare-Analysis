import type { Ingredient, Product, RoutineType } from '@/types'
import { normalizedPositionWeights } from './position-weight'

/**
 * Functional classes that drive real layering interactions. These are
 * matched by name against the ingredient's canonical/INCI name and aliases,
 * because what matters for an interaction is the family (any retinoid, any
 * AHA), not one exact INCI spelling.
 */
export type ActiveClass = 'retinoid' | 'aha' | 'bha' | 'vitamin-c' | 'benzoyl-peroxide'

const ACTIVE_CLASS_MARKERS: Record<ActiveClass, string[]> = {
  retinoid: [
    'retinol',
    'retinal',
    'retinaldehyde',
    'retinyl',
    'tretinoin',
    'adapalene',
    'hydroxypinacolone retinoate',
    'granactive retinoid',
  ],
  aha: ['glycolic acid', 'lactic acid', 'mandelic acid', 'malic acid', 'tartaric acid', 'citric acid'],
  bha: ['salicylic acid', 'betaine salicylate', 'willow bark', 'salix alba'],
  'vitamin-c': ['ascorbic acid', 'ascorbyl', 'ethyl ascorbate', '3-o-ethyl ascorbic'],
  'benzoyl-peroxide': ['benzoyl peroxide'],
}

/**
 * Citric acid appears in a large share of formulas purely as a pH adjuster
 * at a fraction of a percent, where it does no exfoliating at all. Treating
 * that as an AHA would flag an interaction on nearly every routine and
 * train the user to ignore the warnings, so an AHA only counts as one when
 * it carries real weight in the formula.
 */
const EXFOLIANT_RELEVANCE_THRESHOLD = 0.04

/** Cumulative position-weighted irritancy above which a routine is doing too much at once. */
const IRRITANCY_LOAD_THRESHOLD = 1.6

export interface AnalyzedProduct {
  product: Product
  ingredients: Ingredient[]
}

export interface RoutineFinding {
  severity: 'high' | 'medium' | 'info'
  title: string
  detail: string
  productNames: string[]
}

function productName(p: Product): string {
  return p.name ?? 'מוצר סרוק'
}

function searchable(ingredient: Ingredient): string {
  return [ingredient.canonical_name, ingredient.inci_name ?? '', ...(ingredient.aliases ?? [])]
    .join(' ')
    .toLowerCase()
}

/**
 * Which active classes a product meaningfully contains, with exfoliating
 * acids gated on position weight so a trace pH-adjuster doesn't register.
 */
export function productActiveClasses(entry: AnalyzedProduct): Set<ActiveClass> {
  const found = new Set<ActiveClass>()
  const weights = normalizedPositionWeights(entry.ingredients.length)

  entry.ingredients.forEach((ingredient, i) => {
    const haystack = searchable(ingredient)
    for (const [cls, markers] of Object.entries(ACTIVE_CLASS_MARKERS) as [ActiveClass, string[]][]) {
      if (!markers.some((m) => haystack.includes(m))) continue
      const needsWeight = cls === 'aha' || cls === 'bha'
      if (needsWeight && weights[i] < EXFOLIANT_RELEVANCE_THRESHOLD) continue
      found.add(cls)
    }
  })

  return found
}

function withClass(entries: AnalyzedProduct[], cls: ActiveClass): AnalyzedProduct[] {
  return entries.filter((e) => productActiveClasses(e).has(cls))
}

/**
 * Flags evidence-based interactions between the products a user has put in
 * one routine — the layer of analysis a per-product score can't reach,
 * since every product here may be perfectly good on its own and still be a
 * poor idea applied together.
 *
 * Deliberately absent: vitamin C with niacinamide. That pairing is widely
 * repeated as a conflict, but the interaction it derives from requires heat
 * and a low pH simultaneously that skin and finished formulas don't
 * produce; current evidence treats the combination as fine, and warning
 * about it anyway would be following folklore over the research.
 */
export function analyzeRoutine(type: RoutineType, entries: AnalyzedProduct[]): RoutineFinding[] {
  const findings: RoutineFinding[] = []
  if (entries.length === 0) return findings

  const retinoids = withClass(entries, 'retinoid')
  const ahas = withClass(entries, 'aha')
  const bhas = withClass(entries, 'bha')
  const vitaminC = withClass(entries, 'vitamin-c')
  const benzoyl = withClass(entries, 'benzoyl-peroxide')
  const exfoliants = [...new Set([...ahas, ...bhas])]

  if (retinoids.length > 0 && exfoliants.length > 0) {
    findings.push({
      severity: 'high',
      title: 'רטינואיד יחד עם חומצות פילינג',
      detail:
        'שילוב של רטינול/רטינואיד עם חומצות AHA או BHA באותה שגרה מגביר משמעותית את הסיכון לגירוי ולפגיעה במחסום העור. עדיף להפריד ביניהם לימים שונים, או להשתמש בחומצות בבוקר וברטינואיד בערב.',
      productNames: [...retinoids, ...exfoliants].map((e) => productName(e.product)),
    })
  }

  if (retinoids.length > 0 && vitaminC.length > 0) {
    findings.push({
      severity: 'medium',
      title: 'רטינואיד יחד עם ויטמין C',
      detail:
        'ויטמין C ורטינואידים עובדים בתנאי pH שונים ושילובם באותה שגרה עלול להגביר גירוי. הפרדה לפי שעות היום עובדת טוב יותר: ויטמין C בבוקר, רטינואיד בערב.',
      productNames: [...vitaminC, ...retinoids].map((e) => productName(e.product)),
    })
  }

  if (retinoids.length > 0 && benzoyl.length > 0) {
    findings.push({
      severity: 'high',
      title: 'בנזואיל פרוקסיד יחד עם רטינואיד',
      detail:
        'בנזואיל פרוקסיד עלול לפרק חלק מהרטינואידים ולהפחית את יעילותם, ובנוסף השילוב מייבש ומגרה. עדיף להשתמש בהם בשעות או בימים נפרדים.',
      productNames: [...benzoyl, ...retinoids].map((e) => productName(e.product)),
    })
  }

  if (exfoliants.length > 1) {
    findings.push({
      severity: 'medium',
      title: 'יותר ממוצר פילינג אחד באותה שגרה',
      detail:
        'שימוש בכמה מוצרי פילינג יחד מוביל לרוב לקילוף יתר — אדמומיות, יובש ותחושת צריבה. מספיק מוצר פילינג אחד בכל שגרה.',
      productNames: exfoliants.map((e) => productName(e.product)),
    })
  }

  if (type === 'morning' && !entries.some((e) => e.product.category === 'sunscreen')) {
    const hasPhotosensitising = retinoids.length > 0 || exfoliants.length > 0
    findings.push({
      severity: hasPhotosensitising ? 'high' : 'medium',
      title: 'אין קרם הגנה בשגרת הבוקר',
      detail: hasPhotosensitising
        ? 'השגרה כוללת רכיבים שמגבירים רגישות לשמש (רטינואידים או חומצות), ולכן קרם הגנה בבוקר חשוב במיוחד — בלעדיו חלק מהתועלת שלהם הולכת לאיבוד.'
        : 'הגנה מהשמש היא הצעד היחיד עם ההשפעה המוכחת הגדולה ביותר על מניעת נזקי שמש והזדקנות מוקדמת. שווה להוסיף קרם הגנה לשגרת הבוקר.',
      productNames: [],
    })
  }

  const irritancyLoad = entries.reduce((total, entry) => {
    const weights = normalizedPositionWeights(entry.ingredients.length)
    return (
      total +
      entry.ingredients.reduce(
        (sum, ing, i) => sum + (ing.irritancy_rating ?? 0) * weights[i],
        0,
      )
    )
  }, 0)

  if (irritancyLoad >= IRRITANCY_LOAD_THRESHOLD) {
    findings.push({
      severity: 'medium',
      title: 'עומס מצטבר של רכיבים מגרים',
      detail:
        'גם אם כל מוצר בנפרד סביר, הצטברות של כמה מוצרים עם רכיבים מגרים באותה שגרה עלולה לפגוע במחסום העור. שווה לבדוק אם אפשר לוותר על אחד מהם או לפזר אותם על פני ימים שונים.',
      productNames: entries.map((e) => productName(e.product)),
    })
  }

  return findings
}
