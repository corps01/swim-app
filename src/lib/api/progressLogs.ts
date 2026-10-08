import { throwIfSupabaseError } from '../errors'
import { getSupabaseClient } from '../supabase'
import { uploadProgressPhoto } from '../uploadProgressPhoto'

export interface ProgressLog {
  id: string
  childId: string
  instructorId: string
  instructorName: string
  classId: string | null
  photoUrl: string | null
  note: string | null
  createdAt: string
}

interface ProgressLogRow {
  id: string
  child_id: string
  instructor_id: string
  class_id: string | null
  photo_url: string | null
  note: string | null
  created_at: string
}

function mapRow(row: ProgressLogRow, instructorName: string): ProgressLog {
  return {
    id: row.id,
    childId: row.child_id,
    instructorId: row.instructor_id,
    instructorName,
    classId: row.class_id,
    photoUrl: row.photo_url,
    note: row.note,
    createdAt: row.created_at,
  }
}

async function instructorNamesForIds(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (ids.length === 0) return map

  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from('profiles').select('id, full_name').in('id', ids)
  throwIfSupabaseError(error)
  for (const row of data ?? []) {
    map.set(row.id, row.full_name?.trim() || 'Coach')
  }
  return map
}

export interface CreateProgressLogInput {
  childId: string
  classId?: string | null
  note?: string
  photoFile?: File | null
}

export async function createProgressLog(input: CreateProgressLogInput): Promise<ProgressLog> {
  const supabase = getSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  throwIfSupabaseError(authError)
  if (!user) throw new Error('You must be signed in to post an update.')

  const note = input.note?.trim() || null
  let photoUrl: string | null = null

  if (input.photoFile) {
    photoUrl = await uploadProgressPhoto(input.childId, input.photoFile)
  }

  if (!photoUrl && !note) {
    throw new Error('Add a note or photo before posting.')
  }

  const { data, error } = await supabase
    .from('progress_logs')
    .insert({
      child_id: input.childId,
      instructor_id: user.id,
      class_id: input.classId ?? null,
      photo_url: photoUrl,
      note,
    })
    .select('id, child_id, instructor_id, class_id, photo_url, note, created_at')
    .single()

  throwIfSupabaseError(error)
  const names = await instructorNamesForIds([user.id])
  return mapRow(data as ProgressLogRow, names.get(user.id) ?? 'Coach')
}

export async function fetchProgressLogsForChild(childId: string): Promise<ProgressLog[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('progress_logs')
    .select('id, child_id, instructor_id, class_id, photo_url, note, created_at')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })

  throwIfSupabaseError(error)
  const rows = (data ?? []) as ProgressLogRow[]
  const instructorIds = [...new Set(rows.map((row) => row.instructor_id))]
  const names = await instructorNamesForIds(instructorIds)

  return rows.map((row) => mapRow(row, names.get(row.instructor_id) ?? 'Coach'))
}

export async function fetchLatestProgressLogsByChildIds(
  childIds: string[],
): Promise<Map<string, ProgressLog>> {
  const result = new Map<string, ProgressLog>()
  const unique = [...new Set(childIds.filter(Boolean))]
  if (unique.length === 0) return result

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('progress_logs')
    .select('id, child_id, instructor_id, class_id, photo_url, note, created_at')
    .in('child_id', unique)
    .order('created_at', { ascending: false })

  throwIfSupabaseError(error)
  const rows = (data ?? []) as ProgressLogRow[]
  const instructorIds = [...new Set(rows.map((row) => row.instructor_id))]
  const names = await instructorNamesForIds(instructorIds)

  for (const row of rows) {
    if (!result.has(row.child_id)) {
      result.set(row.child_id, mapRow(row, names.get(row.instructor_id) ?? 'Coach'))
    }
  }
  return result
}
