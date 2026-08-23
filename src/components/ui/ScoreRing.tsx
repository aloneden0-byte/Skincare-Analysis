import { motion, useReducedMotion } from 'motion/react'
import { NumberTicker } from '@/components/ui/number-ticker'
import { springSoft } from '@/lib/motion'

interface ScoreRingProps {
  score: number // 0-100
  size?: number
}

/**
 * Semantic, not decorative: the ring's color is carrying the good/medium/weak
 * verdict, so it stays a three-way signal rather than collapsing into the
 * brand green. The tones are the softened pastel versions defined in
 * index.css so they sit inside the palette instead of shouting over it.
 */
function colorForScore(score: number) {
  if (score >= 75) return 'var(--color-score-good)'
  if (score >= 50) return 'var(--color-score-mid)'
  return 'var(--color-score-low)'
}

export function ScoreRing({ score, size = 96 }: ScoreRingProps) {
  const reduceMotion = useReducedMotion()
  const stroke = 11
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, score))
  const progress = clamped / 100
  const color = colorForScore(clamped)

  // The marker dot rides the end of the arc. The arc is drawn from 12
  // o'clock going clockwise, so the angle is offset by -90deg to match.
  const angle = progress * 2 * Math.PI - Math.PI / 2
  const markerX = size / 2 + radius * Math.cos(angle)
  const markerY = size / 2 + radius * Math.sin(angle)

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-primary-light)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={reduceMotion ? false : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress * circumference }}
          transition={reduceMotion ? { duration: 0 } : springSoft}
        />
        {/* White collar makes the dot read as sitting on top of the arc
            rather than being a gap in it. */}
        <motion.g
          initial={reduceMotion ? false : { opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={reduceMotion ? { duration: 0 } : { ...springSoft, delay: 0.35 }}
          style={{ originX: `${markerX}px`, originY: `${markerY}px` }}
        >
          <circle cx={markerX} cy={markerY} r={stroke / 2 + 2} fill="var(--color-surface)" />
          <circle cx={markerX} cy={markerY} r={stroke / 2 - 1.5} fill={color} />
        </motion.g>
      </svg>
      <NumberTicker
        value={Math.round(clamped)}
        className="absolute font-bold text-ink tabular-nums"
        style={{ fontSize: size * 0.28 }}
      />
    </div>
  )
}
