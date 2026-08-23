import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { PillButton } from '@/components/ui/PillButton'
import { useScanFlow } from '@/lib/scan/ScanFlowContext'
import { useSession } from '@/lib/auth/useSession'
import { PRODUCT_CATEGORIES, type ProductCategory } from '@/types'
import { parseIngredientList } from '@/lib/ingredients/parse'
import { resolveIngredientTokens } from '@/lib/ingredients/resolve'
import { createOrGetProduct } from '@/lib/data/products'

export function Categorize() {
  const navigate = useNavigate()
  const { user } = useSession()
  const { ocrText, category, setCategory, reset } = useScanFlow()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!user || !category) return
    setError(null)
    setSubmitting(true)
    try {
      const tokens = parseIngredientList(ocrText)
      if (tokens.length === 0) {
        setError('לא נמצאו רכיבים בטקסט. חזרו לשלב הקודם ובדקו את הרשימה.')
        setSubmitting(false)
        return
      }
      const matches = await resolveIngredientTokens(tokens)
      const { product } = await createOrGetProduct(user.id, ocrText, category, matches)
      reset()
      navigate(`/products/${product.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'משהו השתבש בשמירת המוצר. נסו שוב.')
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h1 className="text-xl font-bold text-ink">איזה סוג מוצר זה?</h1>
        <p className="mt-1 text-sm text-muted">הבחירה משפיעה על אופן חישוב הציון</p>
      </div>

      <Card>
        <div className="flex flex-wrap gap-2">
          {PRODUCT_CATEGORIES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setCategory(value as ProductCategory)}
              className={`rounded-pill px-4 py-2 text-sm font-medium transition-all duration-150 hover:scale-105 active:scale-95 ${
                category === value
                  ? 'bg-primary text-white shadow-md shadow-primary/30'
                  : 'bg-primary-light text-primary hover:bg-primary/20'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <PillButton
        type="button"
        onClick={handleSubmit}
        disabled={!category || submitting}
        className="w-full"
      >
        {submitting ? 'מנתח את הרכיבים...' : 'ניתוח וסיום'}
      </PillButton>
    </div>
  )
}
