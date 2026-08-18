import type { ButtonHTMLAttributes } from 'react'

interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
}

const variants: Record<string, string> = {
  primary: 'bg-primary text-white hover:bg-primary-dark',
  secondary: 'bg-primary-light text-primary hover:bg-primary/20',
  ghost: 'bg-transparent text-ink border border-muted/30 hover:bg-black/5',
}

export function PillButton({
  variant = 'primary',
  className = '',
  disabled,
  ...props
}: PillButtonProps) {
  return (
    <button
      className={`rounded-pill px-6 py-3 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      disabled={disabled}
      {...props}
    />
  )
}
