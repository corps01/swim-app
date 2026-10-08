import type { NewClassScheduleInput } from '../classSchedule'
import { toPostgresTime } from '../classSchedule'
import { formatDeviceCalendarDateKey } from '../timeZone/calendar'
import { throwIfSupabaseError } from '../errors'
import { getSupabaseClient } from '../supabase'

export interface ClassScheduleRuleRow {
  day_of_week: number
  start_time: string
  end_time: string
  location_detail: string | null
  effective_from: string
  effective_until: string | null
}

export function schedulePayloadForRpc(schedule: NewClassScheduleInput): Record<string, unknown> {
  return {
    days_of_week: schedule.daysOfWeek,
    start_time: toPostgresTime(schedule.startTime),
    end_time: toPostgresTime(schedule.endTime),
    location_detail: schedule.locationDetail?.trim() || null,
    effective_from: schedule.seasonStart || formatDeviceCalendarDateKey(),
    effective_until: schedule.seasonEnd || null,
  }
}

function postgresTimeToInput(raw: string): string {
  const parts = raw.split(':')
  return `${parts[0] ?? '00'}:${parts[1] ?? '00'}`
}

/** Collapse rule rows into the single-block schedule our forms edit. */
export function scheduleInputFromRules(rows: ClassScheduleRuleRow[]): NewClassScheduleInput | null {
  if (!rows.length) return null

  const first = rows[0]
  const daysOfWeek = [...new Set(rows.map((row) => row.day_of_week))].sort((a, b) => a - b)
  const seasonStart = rows.reduce(
    (min, row) => (row.effective_from < min ? row.effective_from : min),
    first.effective_from,
  )
  const openEnded = rows.some((row) => row.effective_until == null)
  const seasonEnd = openEnded
    ? null
    : rows.reduce<string | null>((max, row) => {
        const end = row.effective_until
        if (!end) return max
        if (!max || end > max) return end
        return max
      }, null)

  return {
    daysOfWeek,
    startTime: postgresTimeToInput(first.start_time),
    endTime: postgresTimeToInput(first.end_time),
    locationDetail: first.location_detail,
    seasonStart,
    seasonEnd,
  }
}

export interface ClassSeasonRange {
  seasonStart: string
  seasonEnd: string | null
}

/** One season window per class, from `effective_from` / `effective_until` on its rules. */
export async function fetchClassSeasonRanges(
  classIds: string[],
): Promise<Map<string, ClassSeasonRange>> {
  if (classIds.length === 0) return new Map()
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('class_schedule_rules')
    .select('class_id, effective_from, effective_until')
    .in('class_id', classIds)

  throwIfSupabaseError(error)

  const grouped = new Map<string, { starts: string[]; ends: (string | null)[] }>()
  for (const row of data ?? []) {
    const classId = row.class_id as string
    const bucket = grouped.get(classId) ?? { starts: [], ends: [] }
    bucket.starts.push(String(row.effective_from).slice(0, 10))
    bucket.ends.push(row.effective_until ? String(row.effective_until).slice(0, 10) : null)
    grouped.set(classId, bucket)
  }

  const ranges = new Map<string, ClassSeasonRange>()
  for (const [classId, bucket] of grouped) {
    const seasonStart = bucket.starts.reduce((min, value) => (value < min ? value : min))
    const openEnded = bucket.ends.some((value) => value == null)
    const seasonEnd = openEnded
      ? null
      : bucket.ends.reduce<string | null>((max, value) => {
          if (!value) return max
          if (!max || value > max) return value
          return max
        }, null)
    ranges.set(classId, { seasonStart, seasonEnd })
  }
  return ranges
}

export async function fetchClassScheduleRules(classId: string): Promise<ClassScheduleRuleRow[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('class_schedule_rules')
    .select('day_of_week, start_time, end_time, location_detail, effective_from, effective_until')
    .eq('class_id', classId)
    .order('day_of_week')

  throwIfSupabaseError(error)
  return data ?? []
}
