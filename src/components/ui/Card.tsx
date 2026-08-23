import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type CardTone =
  | 'surface'
  | 'sun'
  | 'moon'
  | 'mint'
  | 'blush'
  | 'sky'
  | 'lime'
  | 'primary'
  | 'gradient'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: CardTone
}

/**
 * Pastel tiles carry no shadow on purpose — in this design their color is
 * what separates them from the background, and stacking a shadow on top
 * makes them read as heavy. Only white surfaces and the brand-colored
 * heroes get lift.
 */
const tones: Record<CardTone, string> = {
  surface: 'bg-surface shadow-card',
  sun: 'bg-sun-light shadow-none',
  moon: 'bg-moon-light shadow-none',
  mint: 'bg-mint-light shadow-none',
  blush: 'bg-blush-light shadow-none',
  sky: 'bg-sky-light shadow-none',
  lime: 'bg-lime-light shadow-none',
  primary: 'bg-primary text-white shadow-card',
  gradient: 'bg-[image:var(--gradient-hero)] text-white shadow-float',
}

export function Card({ tone = 'surface', className, ...props }: CardProps) {
  return <div className={cn('rounded-card p-4', tones[tone], className)} {...props} />
}
