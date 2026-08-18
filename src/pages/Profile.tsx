import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { PillButton } from '@/components/ui/PillButton'
import { useSession } from '@/lib/auth/useSession'
import { getSkinProfile, saveSkinProfile } from '@/lib/data/skinProfile'
import { supabase } from '@/lib/supabase'

const SKIN_TYPES = [
  { value: 'oily', label: 'שמן' },
  { value: 'dry', label: 'יבש' },
  { value: 'combination', label: 'מעורב' },
  { value: 'normal', label: 'נורמלי' },
]

const CONCERNS = [
  { value: 'acne', label: 'אקנה ופצעונים' },
  { value: 'sensitivity', label: 'רגישות ואדמומיות' },
  { value: 'aging', label: 'סימני הזדקנות' },
  { value: 'hyperpigmentation', label: 'כתמים ואי-אחידות גוון' },
  { value: 'dehydration', label: 'התייבשות' },
  { value: 'large-pores', label: 'נקבוביות מורחבות' },
]

export function Profile() {
  const { user } = useSession()
  const navigate = useNavigate()
  const [skinType, setSkinType] = useState<string | null>(null)
  const [concerns, setConcerns] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!user) return
    getSkinProfile(user.id).then((profile) => {
      setSkinType(profile?.skin_type ?? null)
      setConcerns(profile?.concerns ?? [])
      setLoading(false)
    })
  }, [user])

  function toggleConcern(value: string) {
    setConcerns((prev) => (prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]))
    setSaved(false)
  }

  async function handleSave() {
    if (!user) return
    await saveSkinProfile(user.id, skinType, concerns)
    setSaved(true)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (loading) return <p className="py-10 text-center text-muted">טוען...</p>

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">פרופיל אישי</h1>
        <p className="mt-1 text-sm text-muted">{user?.email}</p>
      </div>

      <Card>
        <h2 className="mb-3 font-bold text-ink">סוג העור שלי</h2>
        <div className="flex flex-wrap gap-2">
          {SKIN_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                setSkinType(t.value)
                setSaved(false)
              }}
              className={`rounded-pill px-4 py-2 text-sm font-medium transition-colors ${
                skinType === t.value ? 'bg-primary text-white' : 'bg-primary-light text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-bold text-ink">דברים שחשוב לי לטפל בהם</h2>
        <div className="flex flex-wrap gap-2">
          {CONCERNS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => toggleConcern(c.value)}
              className={`rounded-pill px-4 py-2 text-sm font-medium transition-colors ${
                concerns.includes(c.value) ? 'bg-primary text-white' : 'bg-primary-light text-primary'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </Card>

      <PillButton onClick={handleSave} className="w-full">
        {saved ? 'נשמר ✓' : 'שמירת שינויים'}
      </PillButton>

      <PillButton variant="ghost" onClick={handleLogout} className="w-full">
        התנתקות
      </PillButton>
    </div>
  )
}
