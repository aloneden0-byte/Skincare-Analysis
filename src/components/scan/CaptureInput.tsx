import { useRef } from 'react'
import { PillButton } from '@/components/ui/PillButton'

interface CaptureInputProps {
  onFileSelected: (file: File) => void
  disabled?: boolean
}

export function CaptureInput({ onFileSelected, disabled }: CaptureInputProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const libraryInputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onFileSelected(file)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />

      <PillButton
        type="button"
        disabled={disabled}
        onClick={() => cameraInputRef.current?.click()}
        className="w-full"
      >
        צילום עם המצלמה
      </PillButton>
      <PillButton
        type="button"
        variant="secondary"
        disabled={disabled}
        onClick={() => libraryInputRef.current?.click()}
        className="w-full"
      >
        העלאת תמונה מהגלריה
      </PillButton>
    </div>
  )
}
