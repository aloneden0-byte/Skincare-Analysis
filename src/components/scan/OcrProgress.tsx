const STATUS_LABELS: Record<string, string> = {
  'loading tesseract core': 'טוען מנוע זיהוי טקסט...',
  'initializing tesseract': 'מכין את הסריקה...',
  'loading language traineddata': 'טוען מודל שפה...',
  'initializing api': 'כמעט מתחילים...',
  'recognizing text': 'קורא את רשימת הרכיבים...',
}

export function OcrProgress({ status, progress }: { status: string; progress: number }) {
  const label = STATUS_LABELS[status] ?? 'מעבד...'
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <div className="h-2 w-full overflow-hidden rounded-pill bg-primary-light">
        <div
          className="h-full rounded-pill bg-primary transition-all"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
      <p className="text-sm text-muted">{label}</p>
    </div>
  )
}
