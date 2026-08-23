import { motion, useReducedMotion } from 'motion/react'
import type { Ingredient } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { fadeUp } from '@/lib/motion'

function ratingBadge(label: string, rating: number | null, invert = false) {
  if (rating == null) return null
  const bad = invert ? rating <= 1 : rating >= 4
  const good = invert ? rating >= 4 : rating <= 1
  const tone = bad ? 'bad' : good ? 'good' : 'warn'
  return (
    <Badge tone={tone}>
      {label}: {rating}/5
    </Badge>
  )
}

export function IngredientRow({
  ingredient,
  position,
}: {
  ingredient: Ingredient
  position: number
}) {
  const reduceMotion = useReducedMotion()

  return (
    // Entrance is driven by the parent's stagger container rather than a
    // hand-computed animationDelay, so rows stay in step with each other
    // however long the list is.
    <motion.div
      variants={reduceMotion ? undefined : fadeUp}
      className="flex flex-col gap-1.5 border-b border-border py-3 last:border-0"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-muted">{position + 1}</span>
          <span className="font-medium text-ink" dir="ltr">
            {ingredient.canonical_name}
          </span>
        </div>
        {!ingredient.is_rated && <Badge tone="neutral">טרם דורג</Badge>}
      </div>
      {ingredient.description && (
        <p className="text-xs text-muted">{ingredient.description}</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {ratingBadge('קומדוגני', ingredient.comedogenic_rating)}
        {ratingBadge('גירוי', ingredient.irritancy_rating)}
        {ingredient.benefit_score != null && (
          <Badge tone={ingredient.benefit_score >= 7 ? 'good' : 'neutral'}>
            תועלת: {ingredient.benefit_score}/10
          </Badge>
        )}
      </div>
    </motion.div>
  )
}
