import { Loader2 } from 'lucide-react'

export function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted">
      <Loader2 className="animate-spin" size={28} />
      {label && <p className="text-sm">{label}</p>}
    </div>
  )
}
