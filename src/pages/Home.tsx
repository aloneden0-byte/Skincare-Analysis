import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { PillButton } from '@/components/ui/PillButton'
import { useSession } from '@/lib/auth/useSession'
import { getRoutine, getRoutineItems } from '@/lib/data/routines'

export function Home() {
  const { user } = useSession()
  const [morningCount, setMorningCount] = useState<number | null>(null)
  const [eveningCount, setEveningCount] = useState<number | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      const [morning, evening] = await Promise.all([
        getRoutine(user!.id, 'morning'),
        getRoutine(user!.id, 'evening'),
      ])
      const [morningItems, eveningItems] = await Promise.all([
        morning ? getRoutineItems(morning.id) : [],
        evening ? getRoutineItems(evening.id) : [],
      ])
      if (cancelled) return
      setMorningCount(morningItems.length)
      setEveningCount(eveningItems.length)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted">שלום,</p>
        <h1 className="text-xl font-bold text-ink">{user?.email}</h1>
      </div>

      <Card className="flex flex-col items-center gap-4 bg-primary text-white">
        <div>
          <p className="text-center text-lg font-bold">סרקו מוצר טיפוח חדש</p>
          <p className="text-center text-sm text-white/80">
            נבדוק את רשימת הרכיבים ונמצא את הציון וההתאמה עבורכם
          </p>
        </div>
        <Link to="/scan">
          <PillButton className="bg-white text-primary hover:bg-white/90">התחלת סריקה</PillButton>
        </Link>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Link to="/routines">
          <Card className="text-center">
            <p className="text-sm text-muted">שגרת בוקר</p>
            <p className="mt-1 text-2xl font-bold text-primary">{morningCount ?? '—'}</p>
            <p className="text-xs text-muted">מוצרים</p>
          </Card>
        </Link>
        <Link to="/routines">
          <Card className="text-center">
            <p className="text-sm text-muted">שגרת ערב</p>
            <p className="mt-1 text-2xl font-bold text-primary">{eveningCount ?? '—'}</p>
            <p className="text-xs text-muted">מוצרים</p>
          </Card>
        </Link>
      </div>
    </div>
  )
}
