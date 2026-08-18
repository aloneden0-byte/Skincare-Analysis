import { supabase } from '@/lib/supabase'
import type { Product, Routine, RoutineItem, RoutineType } from '@/types'

/**
 * Makes sure a user has both a morning and evening routine row. Safe to call
 * repeatedly (e.g. on every app load) — upsert on the (user_id, type)
 * unique constraint is a no-op if the rows already exist.
 */
export async function ensureRoutines(userId: string): Promise<void> {
  const types: RoutineType[] = ['morning', 'evening']
  const { error } = await supabase
    .from('routines')
    .upsert(
      types.map((type) => ({ user_id: userId, type })),
      { onConflict: 'user_id,type', ignoreDuplicates: true },
    )

  if (error) {
    console.error('Failed to ensure routines exist:', error.message)
  }
}

export async function getRoutine(userId: string, type: RoutineType): Promise<Routine | null> {
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .eq('user_id', userId)
    .eq('type', type)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function getRoutineItems(
  routineId: string,
): Promise<(RoutineItem & { product: Product })[]> {
  const { data, error } = await supabase
    .from('routine_items')
    .select('*, product:products(*)')
    .eq('routine_id', routineId)
    .order('position', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function addProductToRoutine(
  userId: string,
  type: RoutineType,
  productId: string,
): Promise<'added' | 'already_present'> {
  const routine = await getRoutine(userId, type)
  if (!routine) throw new Error('Routine not found')

  const items = await getRoutineItems(routine.id)
  if (items.some((item) => item.product_id === productId)) {
    return 'already_present'
  }

  const nextPosition = items.length > 0 ? Math.max(...items.map((i) => i.position)) + 1 : 0
  const { error } = await supabase
    .from('routine_items')
    .insert({ routine_id: routine.id, product_id: productId, position: nextPosition })
  if (error) throw new Error(error.message)
  return 'added'
}

export async function removeRoutineItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('routine_items').delete().eq('id', itemId)
  if (error) throw new Error(error.message)
}

/** Persists a new ordering for a routine's items (drag-reorder result). */
export async function reorderRoutineItems(items: { id: string; position: number }[]): Promise<void> {
  await Promise.all(
    items.map(({ id, position }) =>
      supabase.from('routine_items').update({ position }).eq('id', id),
    ),
  )
}
