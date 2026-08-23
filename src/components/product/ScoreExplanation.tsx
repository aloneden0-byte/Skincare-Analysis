import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { ScoreExplanation as Explanation } from '@/lib/scoring/explain'

function Row({ name, reason, impact }: { name: string; reason: string; impact: number }) {
  const positive = impact > 0
  return (
    <li className="flex items-center justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink">{name}</p>
        <p className="truncate text-xs text-muted">{reason}</p>
      </div>
      <span
        className={`shrink-0 text-sm font-bold ${positive ? 'text-mint' : 'text-[#c9971f]'}`}
        dir="ltr"
      >
        {positive ? '+' : ''}
        {impact.toFixed(1)}
      </span>
    </li>
  )
}

/**
 * Shows which ingredients actually moved the score, so the number is
 * something the user can audit rather than just trust.
 */
export function ScoreExplanation({ explanation }: { explanation: Explanation }) {
  const { helping, hurting } = explanation
  if (helping.length === 0 && hurting.length === 0) return null

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-bold text-ink">מה משפיע על הציון</h2>

      {helping.length > 0 && (
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm text-mint">
            <TrendingUp size={16} />
            <span className="font-medium">מעלה את הציון</span>
          </div>
          <ul className="divide-y divide-border">
            {helping.map((c) => (
              <Row key={c.ingredientName} name={c.ingredientName} reason={c.reason} impact={c.impact} />
            ))}
          </ul>
        </div>
      )}

      {hurting.length > 0 && (
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm text-[#c9971f]">
            <TrendingDown size={16} />
            <span className="font-medium">מוריד את הציון</span>
          </div>
          <ul className="divide-y divide-border">
            {hurting.map((c) => (
              <Row key={c.ingredientName} name={c.ingredientName} reason={c.reason} impact={c.impact} />
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
