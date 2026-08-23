import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { PillButton } from '@/components/ui/PillButton'
import { useScanFlow } from '@/lib/scan/ScanFlowContext'

export function Review() {
  const navigate = useNavigate()
  const { ocrText, setOcrText } = useScanFlow()

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h1 className="text-xl font-bold text-ink">בדיקת רשימת הרכיבים</h1>
        <p className="mt-1 text-sm text-muted">
          זיהוי הטקסט לא תמיד מדויק — אפשר לתקן לפני שממשיכים. הפרידו בין רכיבים בפסיקים.
        </p>
      </div>

      <Card>
        <textarea
          value={ocrText}
          onChange={(e) => setOcrText(e.target.value)}
          placeholder="Aqua, Glycerin, Niacinamide, Sodium Hyaluronate, Parfum..."
          rows={10}
          dir="ltr"
          className="w-full resize-none rounded-2xl border border-muted/30 p-3 text-sm outline-none focus:border-primary"
        />
      </Card>

      <PillButton
        type="button"
        onClick={() => navigate('/scan/categorize')}
        disabled={!ocrText.trim()}
        className="w-full"
      >
        המשך לבחירת קטגוריה
      </PillButton>
    </div>
  )
}
