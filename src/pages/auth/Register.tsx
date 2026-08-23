import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/lib/auth/useSession'
import { Card } from '@/components/ui/Card'
import { PillButton } from '@/components/ui/PillButton'

export function Register() {
  const { user, loading: sessionLoading } = useSession()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!sessionLoading && user) {
    return <Navigate to="/home" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)

    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים.')
      return
    }

    setSubmitting(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName.trim() } },
    })
    setSubmitting(false)

    if (error) {
      setError(error.message)
      return
    }

    if (data.session) {
      navigate('/home')
    } else {
      setInfo('נרשמת בהצלחה! בדקו את תיבת המייל שלכם לאישור החשבון, ואז התחברו.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm animate-in fade-in zoom-in-95 duration-300">
        <h1 className="mb-1 text-center text-2xl font-bold text-ink">שגרת טיפוח</h1>
        <p className="mb-6 text-center text-sm text-muted">יצירת חשבון חדש</p>
        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">שם</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-2xl border border-border px-4 py-2.5 outline-none focus:border-primary"
                autoComplete="name"
                placeholder="איך נקרא לכם?"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">אימייל</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-border px-4 py-2.5 outline-none focus:border-primary"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">סיסמה</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-border px-4 py-2.5 outline-none focus:border-primary"
                autoComplete="new-password"
              />
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            {info && <p className="text-sm text-emerald-600">{info}</p>}
            <PillButton type="submit" disabled={submitting} className="w-full">
              {submitting ? 'נרשם...' : 'הרשמה'}
            </PillButton>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm text-muted">
          כבר יש לכם חשבון?{' '}
          <Link to="/login" className="font-medium text-primary">
            התחברות
          </Link>
        </p>
      </div>
    </div>
  )
}
