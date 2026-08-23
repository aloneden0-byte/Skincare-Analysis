import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center">
      <button
        type="button"
        aria-label="סגירה"
        className="absolute inset-0 bg-ink/40 animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-surface p-5 pb-8 shadow-card animate-in slide-in-from-bottom duration-300">
        <div className="mb-4 flex items-center justify-between">
          {title ? <h2 className="text-lg font-bold text-ink">{title}</h2> : <span />}
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="rounded-full p-1.5 text-muted transition-colors hover:bg-black/5"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
