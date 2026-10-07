import type { UserRole } from '../../types/database'
import { formatAppError } from '../errors'
import { getSupabaseClient } from '../supabase'

export async function fetchProfile(userId: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, phone, created_at')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function upsertProfile(userId: string, fullName: string, role: UserRole) {
  const supabase = getSupabaseClient()
  const row = {
    id: userId,
    role,
    full_name: fullName.trim(),
  }

  const { data: existing, error: readError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (readError) throw new Error(formatAppError(readError))

  if (existing) {
    const { error } = await supabase.from('profiles').update(row).eq('id', userId)
    if (error) throw new Error(formatAppError(error))
    return
  }

  const { error: insertError } = await supabase.from('profiles').insert(row)
  if (!insertError) return

  const { error: upsertError } = await supabase.from('profiles').upsert(row, { onConflict: 'id' })
  if (upsertError) throw new Error(formatAppError(upsertError))
}
