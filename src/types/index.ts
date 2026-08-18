export type RoutineType = 'morning' | 'evening'

export type ProductCategory =
  | 'serum'
  | 'moisturizer'
  | 'cleanser'
  | 'toner'
  | 'sunscreen'
  | 'exfoliant'
  | 'eye_cream'
  | 'mask'
  | 'oil'
  | 'essence'
  | 'other'

export const PRODUCT_CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: 'serum', label: 'סרום' },
  { value: 'moisturizer', label: 'לחות' },
  { value: 'cleanser', label: 'סבון/ניקוי פנים' },
  { value: 'toner', label: 'טונר' },
  { value: 'sunscreen', label: 'קרם הגנה' },
  { value: 'exfoliant', label: 'פילינג' },
  { value: 'eye_cream', label: 'קרם עיניים' },
  { value: 'mask', label: 'מסכה' },
  { value: 'oil', label: 'שמן' },
  { value: 'essence', label: 'אסנס' },
  { value: 'other', label: 'אחר' },
]

export type SkinTypeTag =
  | 'oily'
  | 'dry'
  | 'combination'
  | 'normal'
  | 'acne-prone'
  | 'sensitive'
  | 'mature'
  | 'all'

export const SKIN_TYPE_LABELS: Record<SkinTypeTag, string> = {
  oily: 'עור שמן',
  dry: 'עור יבש',
  combination: 'עור מעורב',
  normal: 'עור נורמלי',
  'acne-prone': 'עור נוטה לאקנה',
  sensitive: 'עור רגיש',
  mature: 'עור בוגר',
  all: 'מתאים לכל סוגי העור',
}

export interface Ingredient {
  id: string
  canonical_name: string
  inci_name: string | null
  aliases: string[]
  category: string
  comedogenic_rating: number | null
  irritancy_rating: number | null
  benefit_score: number | null
  skin_type_fit: SkinTypeTag[]
  description: string | null
  is_rated: boolean
  source: string | null
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string | null
  brand: string | null
  category: ProductCategory
  raw_ocr_text: string
  ingredient_list_hash: string
  overall_score: number | null
  score_version: number
  created_at: string
  updated_at: string
}

export interface ProductIngredient {
  id: string
  product_id: string
  ingredient_id: string
  position: number
  raw_token: string
  match_score: number | null
  ingredient?: Ingredient
}

export interface SkinFitResult {
  id: string
  product_id: string
  tag: SkinTypeTag
  rank: number
  confidence: number
}

export interface Routine {
  id: string
  user_id: string
  type: RoutineType
}

export interface RoutineItem {
  id: string
  routine_id: string
  product_id: string
  position: number
  product?: Product
}

export interface SkinProfile {
  id: string
  user_id: string
  skin_type: string | null
  concerns: string[]
}

export interface Scan {
  id: string
  user_id: string
  product_id: string | null
  ocr_raw_text: string
  status: 'pending_review' | 'categorized' | 'complete' | 'failed'
  created_at: string
}

export interface ParsedIngredientMatch {
  rawToken: string
  ingredient: Ingredient
  matchScore: number | null
  position: number
}

export interface ProductScoreResult {
  overallScore: number
  highIrritantWarning: boolean
  skinFit: { tag: SkinTypeTag; confidence: number }[]
}
