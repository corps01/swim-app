import type { ResolvedClassInvite, SwimClass, SwimClassInsert } from '../../types/class'
import { schedulePayloadForRpc } from './classSchedule'
import { getDeviceTimeZone } from '../timeZone/device'
import { POOL_TIMEZONE_API_FALLBACK } from '../timeZone/pool'
import { formatAppError } from '../errors'
import { throwIfSupabaseError } from '../errors'
import { getSupabaseClient } from '../supabase'

const CODE_LENGTH = 6

function parseResolvedClass(data: unknown): ResolvedClassInvite | null {
  if (!data || typeof data !== 'object') return null
  const row = data as Record<string, unknown>
  const classId = row.id
  const instructorId = row.instructor_id
  const className = row.name
  const classCode = row.class_code
  const instructorName = row.instructor_name
  const location = row.location
  const scheduleDetails = row.schedule_details
  if (
    typeof classId !== 'string' ||
    typeof instructorId !== 'string' ||
    typeof className !== 'string' ||
    typeof classCode !== 'string' ||
    typeof instructorName !== 'string'
  ) {
    return null
  }
  return {
    classId,
    instructorId,
    instructorName,
    className,
    classCode,
    location: typeof location === 'string' ? location : location === null ? null : null,
    scheduleDetails:
      typeof scheduleDetails === 'string'
        ? scheduleDetails
        : scheduleDetails === null
          ? null
          : null,
  }
}

function parseSwimClassRow(data: unknown): SwimClass | null {
  if (!data || typeof data !== 'object') return null
  const row = data as Record<string, unknown>
  const id = row.id
  const instructor_id = row.instructor_id
  const name = row.name
  const class_code = row.class_code
  const created_at = row.created_at
  if (
    typeof id !== 'string' ||
    typeof instructor_id !== 'string' ||
    typeof name !== 'string' ||
    typeof class_code !== 'string' ||
    typeof created_at !== 'string'
  ) {
    return null
  }
  return {
    id,
    instructor_id,
    name,
    location: typeof row.location === 'string' ? row.location : null,
    schedule_details: typeof row.schedule_details === 'string' ? row.schedule_details : null,
    timezone:
      typeof row.timezone === 'string' && row.timezone.trim()
        ? row.timezone
        : POOL_TIMEZONE_API_FALLBACK,
    class_code,
    max_capacity: typeof row.max_capacity === 'number' ? row.max_capacity : null,
    created_at,
  }
}

/** Resolve a 6-character class code via SECURITY DEFINER RPC (no broad classes SELECT). */
export async function resolveClassByCode(rawCode: string): Promise<ResolvedClassInvite | null> {
  const normalized = rawCode.trim().toUpperCase()
  if (normalized.length !== CODE_LENGTH) return null

  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('get_class_by_code', { p_code: normalized })
  if (error) throw new Error(formatAppError(error))
  return parseResolvedClass(data)
}

export async function fetchInstructorClass(classId: string): Promise<SwimClass | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('classes')
    .select(
      'id, instructor_id, name, location, schedule_details, timezone, class_code, max_capacity, created_at',
    )
    .eq('id', classId)
    .maybeSingle()

  throwIfSupabaseError(error)
  if (!data) return null
  return parseSwimClassRow(data)
}

export async function fetchInstructorClasses(instructorId: string): Promise<SwimClass[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('classes')
    .select(
      'id, instructor_id, name, location, schedule_details, timezone, class_code, max_capacity, created_at',
    )
    .eq('instructor_id', instructorId)
    .order('created_at', { ascending: false })

  throwIfSupabaseError(error)
  return data ?? []
}

/** Creates class + schedule rules atomically via RPC. */
export async function createInstructorClass(
  _instructorId: string,
  input: SwimClassInsert,
): Promise<SwimClass> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('create_class_with_schedule', {
    p_name: input.name.trim(),
    p_location: input.location?.trim() || null,
    p_timezone: getDeviceTimeZone(),
    p_max_capacity: input.max_capacity ?? null,
    p_schedule: schedulePayloadForRpc(input.schedule),
  })

  if (error) throw new Error(formatAppError(error))
  const parsed = parseSwimClassRow(data)
  if (!parsed) {
    throw new Error('Could not create class. Please try again.')
  }
  return parsed
}

export async function updateInstructorClassWithSchedule(
  classId: string,
  input: SwimClassInsert,
): Promise<SwimClass> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('update_class_with_schedule', {
    p_class_id: classId,
    p_name: input.name.trim(),
    p_location: input.location?.trim() || null,
    p_timezone: getDeviceTimeZone(),
    p_max_capacity: input.max_capacity ?? null,
    p_schedule: schedulePayloadForRpc(input.schedule),
  })

  if (error) throw new Error(formatAppError(error))
  const parsed = parseSwimClassRow(data)
  if (!parsed) {
    throw new Error('Could not update class. Please try again.')
  }
  return parsed
}
