import { Link } from 'react-router-dom'
import { Check, AlertTriangle, UserCog } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CONCERN_LABELS } from '@/lib/scoring/concerns'
import type { PersonalFitResult } from '@/lib/scoring/personal-fit'

function fitLabel(score: number) {
  if (score >= 75) return 'מתאים לך היטב'
  if (score >= 55) return 'מתאים לך חלקית'
  return 'פחות מתאים לך'
}

export function PersonalFitCard({ fit }: { fit: PersonalFitResult }) {
  // Without a profile there is nothing personal to say — invite the user to
  // fill one in rather than showing an empty or fabricated result.
  if (fit.score === null) {
    return (
      <Card tone="mint" className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mint text-white">
          <UserCog size={20} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-ink">רוצה ציון מותאם אישית?</p>
          <Link to="/settings" className="text-sm text-primary underline">
            הגדירו סוג עור ומטרות טיפוח
          </Link>
        </div>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-ink">ההתאמה עבורך</h2>
        <span className="text-2xl font-bold text-primary">{fit.score}</span>
      </div>
      <p className="text-sm text-muted">{fitLabel(fit.score)}</p>

      {fit.matchedConcerns.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {fit.matchedConcerns.map((c) => (
            <Badge key={c} tone="primary">
              {CONCERN_LABELS[c]}
            </Badge>
          ))}
        </div>
      )}

      {fit.factors.length > 0 && (
        <ul className="flex flex-col gap-2">
          {fit.factors.map((f, i) => (
            <li key={`${f.ingredientName}-${i}`} className="flex items-start gap-2 text-sm">
              {f.kind === 'positive' ? (
                <Check size={16} className="mt-0.5 shrink-0 text-mint" />
              ) : (
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
              )}
              <span className="text-ink/80">
                <span className="font-medium text-ink">{f.ingredientName}</span> — {f.detail}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
