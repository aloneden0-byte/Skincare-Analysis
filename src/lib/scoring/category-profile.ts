import type { ProductCategory } from '@/types'

interface CategoryProfile {
  /** How much comedogenic rating should count against the score (0-1). */
  comedogenicWeight: number
  /** How much irritancy rating should count against the score (0-1). */
  irritancyWeight: number
}

const LEAVE_ON: CategoryProfile = { comedogenicWeight: 1, irritancyWeight: 1 }

// Rinse-off products have brief skin contact, so comedogenic/irritancy
// penalties should count for less than in leave-on products. This mirrors
// how the (US industry) Cosmetic Ingredient Review panel actually assesses
// ingredient safety: its published conclusions are frequently conditional
// on rinse-off vs. leave-on use (e.g. "safe as used in rinse-off products,
// safe up to X% in leave-on"), rather than one verdict per ingredient
// regardless of product type.
const CATEGORY_PROFILES: Record<ProductCategory, CategoryProfile> = {
  cleanser: { comedogenicWeight: 0.3, irritancyWeight: 0.5 },
  mask: { comedogenicWeight: 0.5, irritancyWeight: 0.6 },
  serum: LEAVE_ON,
  moisturizer: LEAVE_ON,
  toner: LEAVE_ON,
  sunscreen: LEAVE_ON,
  exfoliant: LEAVE_ON,
  eye_cream: LEAVE_ON,
  oil: LEAVE_ON,
  essence: LEAVE_ON,
  other: LEAVE_ON,
}

export function getCategoryProfile(category: ProductCategory): CategoryProfile {
  return CATEGORY_PROFILES[category] ?? LEAVE_ON
}
