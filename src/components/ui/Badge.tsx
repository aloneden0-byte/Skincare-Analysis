import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'primary' | 'good' | 'warn' | 'bad' | 'neutral'
}

const tones: Record<string, string> = {
  primary: 'bg-primary-light text-primary',
  good: 'bg-emerald-100 text-emerald-700',
  warn: 'bg-amber-100 text-amber-700',
  bad: 'bg-rose-100 text-rose-700',
  neutral: 'bg-muted/15 text-muted',
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center rounded-pill px-3 py-1 text-xs font-medium', tones[tone], className)}
      {...props}
    />
  )
}
