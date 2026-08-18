import { useCallback, useEffect, useState } from 'react'
import { useSession } from '@/lib/auth/useSession'
import { getRoutine, getRoutineItems, removeRoutineItem, reorderRoutineItems } from '@/lib/data/routines'
import { RoutineList, type RoutineListItem } from '@/components/routines/RoutineList'
import type { RoutineType } from '@/types'

const TABS: { type: RoutineType; label: string }[] = [
  { type: 'morning', label: 'שגרת בוקר' },
  { type: 'evening', label: 'שגרת ערב' },
]

export function Routines() {
  const { user } = useSession()
  const [activeTab, setActiveTab] = useState<RoutineType>('morning')
  const [items, setItems] = useState<RoutineListItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const routine = await getRoutine(user.id, activeTab)
    if (!routine) {
      setItems([])
      setLoading(false)
      return
    }
    const routineItems = await getRoutineItems(routine.id)
    setItems(routineItems.map((ri) => ({ id: ri.id, product: ri.product })))
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
        {TABS.map((tab) => (
          <button
            key={tab.type}
            type="button"
            onClick={() => setActiveTab(tab.type)}
            className={`flex-1 rounded-pill py-2 text-sm font-medium transition-colors ${
              activeTab === tab.type ? 'bg-primary text-white' : 'text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-8 text-center text-muted">טוען...</p>
      ) : (
        <RoutineList items={items} onReorder={handleReorder} onRemove={handleRemove} />
      )}
    </div>
  )
}
