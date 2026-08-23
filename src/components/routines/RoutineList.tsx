import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PRODUCT_CATEGORIES, type Product } from '@/types'

export interface RoutineListItem {
  id: string
  product: Product
}

function SortableItem({ item, onRemove }: { item: RoutineListItem; onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })
  const categoryLabel = PRODUCT_CATEGORIES.find((c) => c.value === item.product.category)?.label

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
    >
      <Card className="mb-3 flex items-center gap-3 transition-shadow hover:shadow-lg">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none px-1 text-muted transition-colors hover:text-primary"
          aria-label="גרור לשינוי סדר"
        >
          ⠿
        </button>
        <Link to={`/products/${item.product.id}`} className="flex flex-1 items-center justify-between gap-2">
          <div>
            <p className="font-medium text-ink">{item.product.name ?? 'מוצר סרוק'}</p>
            <Badge tone="primary" className="mt-1">
              {categoryLabel}
            </Badge>
          </div>
          {item.product.overall_score != null && (
            <span className="text-lg font-bold text-primary">{Math.round(item.product.overall_score)}</span>
          )}
        </Link>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="px-2 text-muted transition-all duration-150 hover:scale-110 hover:text-rose-600 active:scale-90"
          aria-label="הסרה מהשגרה"
        >
          ✕
        </button>
      </Card>
    </div>
  )
}

export function RoutineList({
  items,
  onReorder,
  onRemove,
}: {
  items: RoutineListItem[]
  onReorder: (newItems: RoutineListItem[]) => void
  onRemove: (itemId: string) => void
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    onReorder(arrayMove(items, oldIndex, newIndex))
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-muted">
        <Sparkles size={28} />
        <p className="text-sm">אין עדיין מוצרים בשגרה הזו.</p>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        {items.map((item) => (
          <SortableItem key={item.id} item={item} onRemove={onRemove} />
        ))}
      </SortableContext>
    </DndContext>
  )
}
