import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { Sun, Moon } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PillButton } from '@/components/ui/PillButton'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { ScoreBreakdown } from '@/components/product/ScoreBreakdown'
import { ScoreExplanation } from '@/components/product/ScoreExplanation'
import { PersonalFitCard } from '@/components/product/PersonalFitCard'
import { IngredientRow } from '@/components/product/IngredientRow'
import { useSession } from '@/lib/auth/useSession'
import { getProduct, getProductIngredients, getProductSkinFit } from '@/lib/data/products'
import { addProductToRoutine } from '@/lib/data/routines'
import { getSkinProfile } from '@/lib/data/skinProfile'
import { computeOverallScore } from '@/lib/scoring/product-score'
import { computePersonalFit } from '@/lib/scoring/personal-fit'
import { explainScore } from '@/lib/scoring/explain'
import {
  PRODUCT_CATEGORIES,
  type Ingredient,
  type Product,
  type SkinFitResult,
  type SkinProfile,
} from '@/types'

interface LoadedIngredient {
  position: number
  ingredient: Ingredient
}

const CELEBRATION_SCORE_THRESHOLD = 85

export function ProductDetail() {
  const { productId } = useParams<{ productId: string }>()
  const { user } = useSession()
  const [product, setProduct] = useState<Product | null>(null)
  const [ingredients, setIngredients] = useState<LoadedIngredient[]>([])
  const [skinFit, setSkinFit] = useState<SkinFitResult[]>([])
  const [loading, setLoading] = useState(true)
  const [routineMessage, setRoutineMessage] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [skinProfile, setSkinProfile] = useState<SkinProfile | null>(null)
  const confettiFired = useRef(false)

  useEffect(() => {
    if (!productId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      const [p, pi, sf, profile] = await Promise.all([
        getProduct(productId!),
        getProductIngredients(productId!),
        getProductSkinFit(productId!),
        user ? getSkinProfile(user.id) : Promise.resolve(null),
      ])
      if (cancelled) return
      setProduct(p)
      setIngredients(pi.map((row) => ({ position: row.position, ingredient: row.ingredient! })))
      setSkinFit(sf)
      setSkinProfile(profile)
      setLoading(false)

      if (!confettiFired.current && (p?.overall_score ?? 0) >= CELEBRATION_SCORE_THRESHOLD) {
        confettiFired.current = true
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.3 },
          colors: ['#7c5cfc', '#8b5cf6', '#ede7fd', '#ffffff'],
        })
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [productId, user])

  async function handleAddToRoutine(type: 'morning' | 'evening') {
    if (!user || !product) return
    setRoutineMessage(null)
    const result = await addProductToRoutine(user.id, type, product.id)
    setSheetOpen(false)
    setRoutineMessage(
      result === 'added'
        ? type === 'morning'
          ? 'נוסף לשגרת הבוקר ✓'
          : 'נוסף לשגרת הערב ✓'
        : 'המוצר כבר נמצא בשגרה הזו',
    )
  }

  if (loading) {
    return <LoadingSpinner label="טוען..." />
  }

  if (!product) {
    return <p className="py-10 text-center text-muted">המוצר לא נמצא.</p>
  }

  const categoryLabel = PRODUCT_CATEGORIES.find((c) => c.value === product.category)?.label
  const orderedIngredients = ingredients.map((i) => i.ingredient)
  const { highIrritantWarning, dataConfidence } = computeOverallScore(
    orderedIngredients,
    product.category,
  )
  const personalFit = computePersonalFit(orderedIngredients, product.category, skinProfile)
  const explanation = explainScore(orderedIngredients, product.category)

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <Badge tone="primary">{categoryLabel}</Badge>
        <h1 className="mt-2 text-xl font-bold text-ink">{product.name ?? 'מוצר סרוק'}</h1>
      </div>

      <Card>
        <ScoreBreakdown
          score={product.overall_score ?? 50}
          skinFit={skinFit}
          highIrritantWarning={highIrritantWarning}
          dataConfidence={dataConfidence}
        />
      </Card>

      <PersonalFitCard fit={personalFit} />

      <ScoreExplanation explanation={explanation} />

      <PillButton className="w-full" onClick={() => setSheetOpen(true)}>
        הוספה לשגרה
      </PillButton>
      {routineMessage && <p className="text-center text-sm text-primary">{routineMessage}</p>}

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="הוספה לאיזו שגרה?">
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => handleAddToRoutine('morning')}
            className="flex items-center gap-3 rounded-2xl bg-sun-light p-4 text-right transition-transform active:scale-95"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sun text-white">
              <Sun size={20} />
            </div>
            <span className="font-medium text-ink">שגרת בוקר</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddToRoutine('evening')}
            className="flex items-center gap-3 rounded-2xl bg-moon-light p-4 text-right transition-transform active:scale-95"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-moon text-white">
              <Moon size={20} />
            </div>
            <span className="font-medium text-ink">שגרת ערב</span>
          </button>
        </div>
      </BottomSheet>

      <Card>
        <h2 className="mb-2 font-bold text-ink">רשימת רכיבים ({ingredients.length})</h2>
        <div>
          {ingredients.map(({ position, ingredient }) => (
            <IngredientRow key={ingredient.id} ingredient={ingredient} position={position} />
          ))}
        </div>
      </Card>

      <Link to="/scan" className="text-center text-sm text-primary">
        סריקת מוצר נוסף
      </Link>
    </div>
  )
}
