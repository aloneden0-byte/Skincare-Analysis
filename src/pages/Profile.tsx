import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { PillButton } from '@/components/ui/PillButton'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useSession, getDisplayName } from '@/lib/auth/useSession'
import { supabase } from '@/lib/supabase'

export function Profile() {
  const { user, loading } = useSession()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (user) setName(getDisplayName(user))
  }, [user])

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    await supabase.auth.updateUser({ data: { display_name: name.trim() } })
    setSaving(false)
    setSaved(true)
  }

  if (loading) return <LoadingSpinner label="טוען..." />

  const initial = getDisplayName(user).trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-ink">פרופיל אישי</h1>

      <Card className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary-light text-2xl font-bold text-primary">
          {initial}
        </div>
        <p className="text-sm text-muted">{user?.email}</p>
      </Card>

      <Card>
        <label className="mb-1 block text-sm font-medium text-ink">השם שלי</label>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setSaved(false)
          }}
          className="w-full rounded-2xl border border-border px-4 py-2.5 outline-none focus:border-primary"
        />
      </Card>

      <PillButton onClick={handleSave} disabled={saving || !name.trim()} className="w-full">
        {saved ? 'נשמר ✓' : saving ? 'שומר...' : 'שמירת שינויים'}
      </PillButton>
    </div>
  )
}
