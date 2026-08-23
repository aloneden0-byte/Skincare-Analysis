import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/lib/auth/useSession'
import { useDevAutoLogin } from '@/lib/auth/useDevAutoLogin'
import { Card } from '@/components/ui/Card'
import { PillButton } from '@/components/ui/PillButton'

export function Login() {
  const { user, loading: sessionLoading } = useSession()
  const { attempting: autoLoginAttempting } = useDevAutoLogin()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!sessionLoading && user) {
    return <Navigate to="/home" replace />
  }

  if (autoLoginAttempting) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        מתחבר אוטומטית (מצב פיתוח)...
      </div>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (error) {
      setError('אימייל או סיסמה שגויים.')
      return
    }
    navigate('/home')
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm animate-in fade-in zoom-in-95 duration-300">
        <h1 className="mb-1 text-center text-2xl font-bold text-ink">שגרת טיפוח</h1>
        <p className="mb-6 text-center text-sm text-muted">
          התחברו כדי לנהל את שגרות הטיפוח שלכם
        </p>
        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <PillButton type="submit" disabled={submitting} className="w-full">
              {submitting ? 'מתחבר...' : 'התחברות'}
            </PillButton>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm text-muted">
          אין לכם חשבון?{' '}
          <Link to="/register" className="font-medium text-primary">
            הרשמה
          </Link>
        </p>
      </div>
    </div>
  )
}
