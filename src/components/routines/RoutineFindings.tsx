import { motion, useReducedMotion } from 'motion/react'
import { AlertTriangle, Info, ShieldCheck } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { fadeUp, staggerContainer } from '@/lib/motion'
import type { RoutineFinding } from '@/lib/scoring/routine-analysis'

const SEVERITY_STYLES: Record<RoutineFinding['severity'], { badge: string; icon: typeof Info }> = {
  high: { badge: 'bg-blush-light text-[#c25563]', icon: AlertTriangle },
  medium: { badge: 'bg-sun-light text-[#a97c12]', icon: AlertTriangle },
  info: { badge: 'bg-primary-light text-primary-dark', icon: Info },
}

export function RoutineFindings({
  findings,
  isEmpty,
}: {
  findings: RoutineFinding[]
  /** True when the routine has no products at all — nothing to analyse yet. */
  isEmpty: boolean
}) {
  const reduceMotion = useReducedMotion()

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
    <motion.div
      className="flex flex-col gap-3"
      variants={reduceMotion ? undefined : staggerContainer(0.08)}
      initial={reduceMotion ? false : 'hidden'}
      animate="visible"
    >
      <h2 className="font-bold text-ink">בדיקת השגרה</h2>
      {findings.map((finding, i) => {
        const { badge, icon: Icon } = SEVERITY_STYLES[finding.severity]
        return (
          <motion.div key={`${finding.title}-${i}`} variants={reduceMotion ? undefined : fadeUp}>
            <Card className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full ${badge}`}
                >
                  <Icon size={15} />
                </span>
                <h3 className="font-medium text-ink">{finding.title}</h3>
              </div>
              <p className="text-sm leading-relaxed text-ink/75">{finding.detail}</p>
              {finding.productNames.length > 0 && (
                <p className="text-xs text-muted">{finding.productNames.join(' · ')}</p>
              )}
            </Card>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
