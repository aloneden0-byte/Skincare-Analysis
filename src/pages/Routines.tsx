import { useCallback, useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useSession } from '@/lib/auth/useSession'
import { getRoutine, getRoutineItems, removeRoutineItem, reorderRoutineItems } from '@/lib/data/routines'
import { getIngredientsForProducts } from '@/lib/data/products'
import { RoutineList, type RoutineListItem } from '@/components/routines/RoutineList'
import { RoutineFindings } from '@/components/routines/RoutineFindings'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { analyzeRoutine, type RoutineFinding } from '@/lib/scoring/routine-analysis'
import { springIndicator } from '@/lib/motion'
import type { RoutineType } from '@/types'

const TABS: { type: RoutineType; label: string }[] = [
  { type: 'morning', label: 'שגרת בוקר' },
  { type: 'evening', label: 'שגרת ערב' },
]

export function Routines() {
  const { user } = useSession()
  const reduceMotion = useReducedMotion()
  const [activeTab, setActiveTab] = useState<RoutineType>('morning')
  const [items, setItems] = useState<RoutineListItem[]>([])
  const [findings, setFindings] = useState<RoutineFinding[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const routine = await getRoutine(user.id, activeTab)
    if (!routine) {
      setItems([])
      setFindings([])
      setLoading(false)
      return
    }
    const routineItems = await getRoutineItems(routine.id)
    setItems(routineItems.map((ri) => ({ id: ri.id, product: ri.product })))

    const ingredientsByProduct = await getIngredientsForProducts(
      routineItems.map((ri) => ri.product_id),
    )
    setFindings(
      analyzeRoutine(
        activeTab,
        routineItems.map((ri) => ({
          product: ri.product,
          ingredients: ingredientsByProduct.get(ri.product_id) ?? [],
        })),
      ),
    )
    setLoading(false)
  }, [user, activeTab])

  useEffect(() => {
    load()
  }, [load])

  async function handleReorder(newItems: RoutineListItem[]) {
    setItems(newItems)
    await reorderRoutineItems(newItems.map((item, position) => ({ id: item.id, position })))
  }

  async function handleRemove(itemId: string) {
    setItems((prev) => prev.filter((i) => i.id !== itemId))
    await removeRoutineItem(itemId)
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-ink">שגרות הטיפוח שלי</h1>

      <div className="flex gap-2 rounded-pill bg-primary-light p-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.type
          return (
            <button
              key={tab.type}
              type="button"
              onClick={() => setActiveTab(tab.type)}
              className="relative flex-1 rounded-pill py-2 text-sm font-medium transition-colors duration-200"
            >
              {/* Shared element: the filled pill slides between tabs rather
                  than one fading out while another fades in. */}
              {isActive && (
                <motion.span
                  layoutId="routine-tab-pill"
                  transition={reduceMotion ? { duration: 0 } : springIndicator}
                  className="absolute inset-0 rounded-pill bg-primary shadow-float"
                />
              )}
              <span className={`relative z-10 ${isActive ? 'text-white' : 'text-primary-dark'}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <RoutineList items={items} onReorder={handleReorder} onRemove={handleRemove} />
          <RoutineFindings findings={findings} isEmpty={items.length === 0} />
        </>
      )}
    </div>
  )
}
