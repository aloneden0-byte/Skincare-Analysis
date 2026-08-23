import { AlertTriangle, Info, ShieldCheck } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { RoutineFinding } from '@/lib/scoring/routine-analysis'

const SEVERITY_STYLES: Record<RoutineFinding['severity'], { badge: string; icon: typeof Info }> = {
  high: { badge: 'bg-red-100 text-red-700', icon: AlertTriangle },
  medium: { badge: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  info: { badge: 'bg-primary-light text-primary', icon: Info },
}

export function RoutineFindings({
  findings,
  isEmpty,
}: {
  findings: RoutineFinding[]
  /** True when the routine has no products at all — nothing to analyse yet. */
  isEmpty: boolean
}) {
  if (isEmpty) return null

  if (findings.length === 0) {
    return (
      <Card tone="mint" className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mint text-white">
          <ShieldCheck size={20} />
        </div>
        <p className="text-sm text-ink">לא נמצאו התנגשויות בין המוצרים בשגרה הזו.</p>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-bold text-ink">בדיקת השגרה</h2>
      {findings.map((finding, i) => {
        const { badge, icon: Icon } = SEVERITY_STYLES[finding.severity]
        return (
          <Card key={`${finding.title}-${i}`} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${badge}`}>
                <Icon size={15} />
              </span>
              <h3 className="font-medium text-ink">{finding.title}</h3>
            </div>
            <p className="text-sm leading-relaxed text-ink/75">{finding.detail}</p>
            {finding.productNames.length > 0 && (
              <p className="text-xs text-muted">{finding.productNames.join(' · ')}</p>
            )}
          </Card>
        )
      })}
    </div>
  )
}
