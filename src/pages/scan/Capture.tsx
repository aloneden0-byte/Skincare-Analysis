import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { CaptureInput } from '@/components/scan/CaptureInput'
import { OcrProgress } from '@/components/scan/OcrProgress'
import { PillButton } from '@/components/ui/PillButton'
import { resizeImageFile } from '@/lib/images/resize'
import { recognizeIngredientLabel, type OcrProgressEvent } from '@/lib/ocr/tesseract-client'
import { useScanFlow } from '@/lib/scan/ScanFlowContext'

export function Capture() {
  const navigate = useNavigate()
  const { setOcrText, reset } = useScanFlow()
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState<OcrProgressEvent>({ status: '', progress: 0 })
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setError(null)
    setProcessing(true)
    try {
      const resized = await resizeImageFile(file)
      const text = await recognizeIngredientLabel(resized, setProgress)
      setOcrText(text)
      navigate('/scan/review')
    } catch {
      setError('לא הצלחנו לקרוא את התמונה. אפשר לנסות שוב, או להזין את הרכיבים ידנית.')
    } finally {
      setProcessing(false)
    }
  }

  function skipToManualEntry() {
    reset()
    navigate('/scan/review')
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">סריקת מוצר חדש</h1>
        <p className="mt-1 text-sm text-muted">
          צלמו או העלו תמונה ברורה של רשימת הרכיבים שעל גבי האריזה
        </p>
      </div>

      <Card>
        {processing ? (
          <OcrProgress status={progress.status} progress={progress.progress} />
        ) : (
          <CaptureInput onFileSelected={handleFile} disabled={processing} />
        )}
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      </Card>

      <PillButton type="button" variant="ghost" onClick={skipToManualEntry} disabled={processing}>
        הזנת רכיבים ידנית במקום
      </PillButton>
    </div>
  )
}
