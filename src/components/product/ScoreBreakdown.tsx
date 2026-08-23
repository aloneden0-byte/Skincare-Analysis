import { ScoreRing } from '@/components/ui/ScoreRing'
import { Badge } from '@/components/ui/Badge'
import { SKIN_TYPE_LABELS, type SkinFitResult } from '@/types'

function scoreLabel(score: number) {
  if (score >= 75) return 'איכות טובה'
  if (score >= 50) return 'איכות בינונית'
  return 'שווה לשקול חלופה'
}

export function ScoreBreakdown({
  score,
  skinFit,
  highIrritantWarning,
}: {
  score: number
  skinFit: SkinFitResult[]
  highIrritantWarning: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-2 text-center">
      <ScoreRing score={score} size={120} />
      <p className="font-medium text-ink">{scoreLabel(score)}</p>

      {skinFit.length > 0 && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-muted">מתאים במיוחד ל:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {skinFit.map((s, i) => (
              <Badge
                key={s.tag}
                tone="primary"
                className="animate-in fade-in zoom-in-75"
                style={{ animationDelay: `${300 + i * 100}ms`, animationDuration: '300ms', animationFillMode: 'backwards' }}
              >
                {SKIN_TYPE_LABELS[s.tag] ?? s.tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {highIrritantWarning && (
        <p className="max-w-xs text-xs text-amber-700">
          ⚠ המוצר מכיל רכיב עם פוטנציאל גירוי גבוה בריכוז משמעותי — כדאי לשים לב אם יש רגישות עורית.
        </p>
      )}
    </div>
  )
}
