import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useSession } from '@/lib/auth/useSession'
import { ensureRoutines } from '@/lib/data/routines'
import { BottomNav } from './BottomNav'

export function AppShell() {
  const { user, loading } = useSession()

  useEffect(() => {
    if (user) void ensureRoutines(user.id)
  }, [user])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        טוען...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-md px-4 pb-28 pt-6">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}
