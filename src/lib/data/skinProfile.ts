import { supabase } from '@/lib/supabase'
import type { SkinProfile } from '@/types'

export async function getSkinProfile(userId: string): Promise<SkinProfile | null> {
  const { data, error } = await supabase
    .from('skin_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function saveSkinProfile(
  userId: string,
  skinType: string | null,
  concerns: string[],
): Promise<void> {
  const { error } = await supabase
    .from('skin_profiles')
    .upsert({ user_id: userId, skin_type: skinType, concerns }, { onConflict: 'user_id' })
  if (error) throw new Error(error.message)
}
