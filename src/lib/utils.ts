import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges Tailwind class lists with "last one wins" semantics for
 * conflicting utilities (e.g. a caller-supplied `bg-primary` reliably
 * overrides a component's default `bg-surface`). Plain string
 * concatenation doesn't guarantee this — which utility wins depends on
 * Tailwind's generated stylesheet order, not the order classes appear in
 * the `class` attribute.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
