import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'primary' | 'good' | 'warn' | 'bad' | 'neutral'
}

// Pastel fills with a deeper text tone of the same hue, matching the chip
// treatment in the design. Kept off Tailwind's default emerald/amber/rose
// so these move with the palette tokens rather than drifting from it.
const tones: Record<string, string> = {
  primary: 'bg-primary-light text-primary-dark',
  good: 'bg-mint-light text-[#2f8b70]',
  warn: 'bg-sun-light text-[#a97c12]',
  bad: 'bg-blush-light text-[#c25563]',
  neutral: 'bg-muted/12 text-muted',
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center rounded-pill px-3 py-1 text-xs font-medium', tones[tone], className)}
      {...props}
    />
  )
}
