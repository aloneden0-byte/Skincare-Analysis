import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useSession } from '@/lib/auth/useSession'
import { ensureRoutines } from '@/lib/data/routines'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { pageTransition } from '@/lib/motion'
import { BottomNav } from './BottomNav'

export function AppShell() {
  const { user, loading } = useSession()
  const location = useLocation()
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (user) void ensureRoutines(user.id)
  }, [user])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen">
      {/* mode="wait" so the outgoing page finishes leaving before the next
          arrives — with both on screen at once the two would overlap and
          the transition reads as a flicker. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          variants={reduceMotion ? undefined : pageTransition}
          initial={reduceMotion ? false : 'hidden'}
          animate="visible"
          exit={reduceMotion ? undefined : 'exit'}
          className="mx-auto max-w-md px-4 pb-36 pt-6"
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
      <BottomNav />
    </div>
  )
}
