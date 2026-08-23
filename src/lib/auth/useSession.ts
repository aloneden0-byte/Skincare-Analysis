import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

/** The name the user chose at signup, falling back to their email. */
export function getDisplayName(user: User | null | undefined): string {
  const name = user?.user_metadata?.display_name
  return typeof name === 'string' && name.trim() ? name.trim() : (user?.email ?? '')
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  return { session, user: session?.user ?? null, loading }
}
