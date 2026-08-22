import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useSession } from './useSession'

const DEV_EMAIL = import.meta.env.VITE_DEV_AUTO_LOGIN_EMAIL as string | undefined
const DEV_PASSWORD = import.meta.env.VITE_DEV_AUTO_LOGIN_PASSWORD as string | undefined

/**
 * Local-development-only convenience: if VITE_DEV_AUTO_LOGIN_EMAIL/PASSWORD
 * are set in .env, automatically sign in on load instead of showing the
 * login form every time. Gated on import.meta.env.DEV, so this is dead code
 * (and the credentials are never bundled) in a production build — the
 * GitHub Pages deploy always shows the real login screen.
 */
export function useDevAutoLogin() {
  const { user, loading: sessionLoading } = useSession()
  const [attempting, setAttempting] = useState(import.meta.env.DEV && !!DEV_EMAIL && !!DEV_PASSWORD)
  const attempted = useRef(false)

  useEffect(() => {
    if (!import.meta.env.DEV || !DEV_EMAIL || !DEV_PASSWORD) return
    if (sessionLoading || user || attempted.current) return

    attempted.current = true
    supabase.auth.signInWithPassword({ email: DEV_EMAIL, password: DEV_PASSWORD }).finally(() => {
      setAttempting(false)
    })
  }, [sessionLoading, user])

  return { attempting: attempting && !user }
}
