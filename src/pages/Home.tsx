import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { Sun, Moon, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { useSession, getDisplayName } from '@/lib/auth/useSession'
import { getRoutine, getRoutineItems } from '@/lib/data/routines'
import { fadeUp, popIn, staggerContainer, motionProps } from '@/lib/motion'

export function Home() {
  const { user } = useSession()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
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

  const name = getDisplayName(user)
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  return (
    <motion.div
      className="flex flex-col gap-6"
      {...motionProps(reduceMotion, staggerContainer(0.08))}
    >
      <motion.div variants={reduceMotion ? undefined : fadeUp} className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-full bg-primary-light text-lg font-bold text-primary-dark">
          {initial}
        </div>
        <div>
          <p className="text-sm text-muted">שלום,</p>
          <h1 className="text-xl font-bold text-ink">{name}</h1>
        </div>
      </motion.div>

      <motion.div variants={reduceMotion ? undefined : fadeUp}>
        <Card tone="gradient" className="relative overflow-hidden">
          {/* Soft light blooms, echoing the organic shapes behind the
              reference's header. Purely atmospheric, so hidden from AT. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-white/20 blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-16 -left-8 size-36 rounded-full bg-white/15 blur-2xl"
          />
          <div className="relative flex flex-col items-center gap-4">
            <motion.div
              animate={reduceMotion ? undefined : { y: [0, -5, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Sparkles size={26} className="text-white/95" />
            </motion.div>
            <div>
              <p className="text-center text-lg font-bold">סרקו מוצר טיפוח חדש</p>
              <p className="text-center text-sm text-white/85">
                נבדוק את רשימת הרכיבים ונמצא את הציון וההתאמה עבורכם
              </p>
            </div>
            <ShimmerButton
              onClick={() => navigate('/scan')}
              background="#ffffff"
              shimmerColor="#7bc950"
              borderRadius="9999px"
              className="font-medium text-primary-dark shadow-none"
            >
              התחלת סריקה
            </ShimmerButton>
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { to: '/routines', tone: 'sun' as const, icon: Sun, chip: 'bg-sun', count: morningCount, label: 'שגרת בוקר' },
          { to: '/routines', tone: 'moon' as const, icon: Moon, chip: 'bg-moon', count: eveningCount, label: 'שגרת ערב' },
        ].map(({ to, tone, icon: Icon, chip, count, label }) => (
          <motion.div key={label} variants={reduceMotion ? undefined : popIn}>
            <motion.div whileTap={reduceMotion ? undefined : { scale: 0.96 }}>
              <Link to={to}>
                <Card tone={tone} className="flex flex-col gap-3">
                  <div className={`flex size-9 items-center justify-center rounded-full ${chip} text-white`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-ink">{count ?? '—'}</p>
                    <p className="text-sm text-ink/60">{label}</p>
                  </div>
                </Card>
              </Link>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
