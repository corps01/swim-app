import { throwIfSupabaseError } from '../errors'
import { getSupabaseClient } from '../supabase'

export interface ProgressCheerState {
  count: number
  cheeredByMe: boolean
}

export async function fetchCheersForLogs(
  logIds: string[],
  parentId: string,
): Promise<Map<string, ProgressCheerState>> {
  const result = new Map<string, ProgressCheerState>()
  const unique = [...new Set(logIds.filter(Boolean))]
  for (const id of unique) {
    result.set(id, { count: 0, cheeredByMe: false })
  }
  if (unique.length === 0) return result

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('progress_log_cheers')
    .select('progress_log_id, parent_id')
    .in('progress_log_id', unique)

  throwIfSupabaseError(error)
  for (const row of data ?? []) {
    const current = result.get(row.progress_log_id) ?? { count: 0, cheeredByMe: false }
    current.count += 1
    if (row.parent_id === parentId) current.cheeredByMe = true
    result.set(row.progress_log_id, current)
  }
  return result
}

export async function setProgressCheer(logId: string, parentId: string, cheered: boolean): Promise<void> {
  const supabase = getSupabaseClient()
  if (cheered) {
    const { error } = await supabase.from('progress_log_cheers').insert({
      progress_log_id: logId,
      parent_id: parentId,
    })
    if (error && error.code !== '23505') throwIfSupabaseError(error)
    return
  }

  const { error } = await supabase
    .from('progress_log_cheers')
    .delete()
    .eq('progress_log_id', logId)
    .eq('parent_id', parentId)
  throwIfSupabaseError(error)
}
