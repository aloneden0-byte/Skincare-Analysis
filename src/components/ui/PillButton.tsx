import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
}

const variants: Record<string, string> = {
  primary: 'bg-primary text-white shadow-float hover:bg-primary-dark',
  secondary: 'bg-primary-light text-primary-dark hover:bg-primary/20',
  ghost: 'bg-transparent text-ink border border-border hover:bg-black/5',
}

export function PillButton({ variant = 'primary', className, disabled, ...props }: PillButtonProps) {
  return (
    <button
      className={cn(
        'rounded-pill px-6 py-3 font-medium transition-all duration-150 ease-out',
        'hover:scale-[1.03] active:scale-95',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none',
        variants[variant],
        className,
      )}
      disabled={disabled}
      {...props}
    />
  )
}
