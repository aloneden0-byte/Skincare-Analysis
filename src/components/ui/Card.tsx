import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: 'surface' | 'sun' | 'moon' | 'mint' | 'primary'
}

const tones: Record<string, string> = {
  surface: 'bg-surface shadow-card',
  sun: 'bg-sun-light shadow-none',
  moon: 'bg-moon-light shadow-none',
  mint: 'bg-mint-light shadow-none',
  primary: 'bg-primary text-white shadow-card',
}

export function Card({ tone = 'surface', className, ...props }: CardProps) {
  return <div className={cn('rounded-card p-4', tones[tone], className)} {...props} />
}
