import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PillButton } from '@/components/ui/PillButton'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ScoreBreakdown } from '@/components/product/ScoreBreakdown'
import { IngredientRow } from '@/components/product/IngredientRow'
import { useSession } from '@/lib/auth/useSession'
import { getProduct, getProductIngredients, getProductSkinFit } from '@/lib/data/products'
import { addProductToRoutine } from '@/lib/data/routines'
import { computeOverallScore } from '@/lib/scoring/product-score'
import { PRODUCT_CATEGORIES, type Ingredient, type Product, type SkinFitResult } from '@/types'

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
  const confettiFired = useRef(false)

  useEffect(() => {
    if (!productId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      const [p, pi, sf] = await Promise.all([
        getProduct(productId!),
        getProductIngredients(productId!),
        getProductSkinFit(productId!),
      ])
      if (cancelled) return
      setProduct(p)
      setIngredients(pi.map((row) => ({ position: row.position, ingredient: row.ingredient! })))
      setSkinFit(sf)
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
  }, [productId])

  async function handleAddToRoutine(type: 'morning' | 'evening') {
    if (!user || !product) return
    setRoutineMessage(null)
    const result = await addProductToRoutine(user.id, type, product.id)
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
  const { highIrritantWarning } = computeOverallScore(
    ingredients.map((i) => i.ingredient),
    product.category,
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Badge tone="primary">{categoryLabel}</Badge>
        <h1 className="mt-2 text-xl font-bold text-ink">{product.name ?? 'מוצר סרוק'}</h1>
      </div>

      <Card>
        <ScoreBreakdown
          score={product.overall_score ?? 50}
          skinFit={skinFit}
          highIrritantWarning={highIrritantWarning}
        />
      </Card>

      <div className="flex gap-3">
        <PillButton className="flex-1" onClick={() => handleAddToRoutine('morning')}>
          הוספה לשגרת בוקר
        </PillButton>
        <PillButton
          variant="secondary"
          className="flex-1"
          onClick={() => handleAddToRoutine('evening')}
        >
          הוספה לשגרת ערב
        </PillButton>
      </div>
      {routineMessage && <p className="text-center text-sm text-primary">{routineMessage}</p>}

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
