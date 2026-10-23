import { POOL_TIMEZONE_API_FALLBACK } from '../lib/timeZone/pool'
import { addCalendarDays, formatCalendarDateKey } from '../lib/timeZone/calendar'
import { formatAppError } from '../lib/errors'
import { getSupabaseClient } from '../lib/supabase'
import type { UpcomingClassAlarm } from './localNotifications'

const HORIZON_DAYS = 14

interface RuleRow {
  classId: string
  dayOfWeek: number
  startTime: string
  effectiveFrom: string
  effectiveUntil: string | null
}

interface ExceptionRow {
  isCancelled: boolean
  overrideStartTime: string | null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function isoDayOfWeek(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number)
  const weekday = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay()
  return weekday === 0 ? 7 : weekday
}

/**
 * Sessions for the signed-in parent's swimmers over the next two weeks.
 * Start times stay as pool-local clocks; the alarm service converts them.
 */
export async function fetchUpcomingClassAlarms(userId: string): Promise<UpcomingClassAlarm[]> {
  const supabase = getSupabaseClient()

  const { data: links, error: linkError } = await supabase
    .from('parent_child_relationships')
    .select('child_id')
    .eq('parent_id', userId)
  if (linkError) throw new Error(formatAppError(linkError))

  const childIds = (links ?? [])
    .map((row) => asRecord(row)?.child_id)
    .filter((id): id is string => typeof id === 'string')
  if (childIds.length === 0) return []

  const [{ data: children, error: childError }, { data: enrollments, error: enrollmentError }] =
    await Promise.all([
      supabase.from('children').select('id, first_name, last_name').in('id', childIds),
      supabase
        .from('child_instructor_relationships')
        .select('child_id, class_id, status')
        .in('child_id', childIds)
        .eq('status', 'active'),
    ])
  if (childError) throw new Error(formatAppError(childError))
  if (enrollmentError) throw new Error(formatAppError(enrollmentError))

  const nameByChild = new Map<string, string>()
  for (const row of children ?? []) {
    const record = asRecord(row)
    if (!record || typeof record.id !== 'string') continue
    const first = typeof record.first_name === 'string' ? record.first_name.trim() : ''
    const last = typeof record.last_name === 'string' ? record.last_name.trim() : ''
    nameByChild.set(record.id, `${first} ${last}`.trim() || 'your swimmer')
  }

  const classIds = new Set<string>()
  const pairs: Array<{ childId: string; classId: string }> = []
  for (const row of enrollments ?? []) {
    const record = asRecord(row)
    if (!record || typeof record.child_id !== 'string' || typeof record.class_id !== 'string') continue
    classIds.add(record.class_id)
    pairs.push({ childId: record.child_id, classId: record.class_id })
  }
  if (classIds.size === 0) return []

  const ids = [...classIds]
  const [{ data: classes, error: classError }, { data: rules, error: ruleError }, { data: exceptions, error: exceptionError }] =
    await Promise.all([
      supabase.from('classes').select('id, timezone').in('id', ids),
      supabase
        .from('class_schedule_rules')
        .select('class_id, day_of_week, start_time, effective_from, effective_until')
        .in('class_id', ids),
      supabase
        .from('class_schedule_exceptions')
        .select('class_id, exception_date, is_cancelled, override_start_time')
        .in('class_id', ids),
    ])
  if (classError) throw new Error(formatAppError(classError))
  if (ruleError) throw new Error(formatAppError(ruleError))
  if (exceptionError) throw new Error(formatAppError(exceptionError))

  const zoneByClass = new Map<string, string>()
  for (const row of classes ?? []) {
    const record = asRecord(row)
    if (!record || typeof record.id !== 'string') continue
    zoneByClass.set(
      record.id,
      typeof record.timezone === 'string' && record.timezone ? record.timezone : POOL_TIMEZONE_API_FALLBACK,
    )
  }

  const rulesByClass = new Map<string, RuleRow[]>()
  for (const row of rules ?? []) {
    const record = asRecord(row)
    if (
      !record ||
      typeof record.class_id !== 'string' ||
      typeof record.day_of_week !== 'number' ||
      typeof record.start_time !== 'string' ||
      typeof record.effective_from !== 'string'
    ) {
      continue
    }
    const list = rulesByClass.get(record.class_id) ?? []
    list.push({
      classId: record.class_id,
      dayOfWeek: record.day_of_week,
      startTime: record.start_time,
      effectiveFrom: record.effective_from,
      effectiveUntil: typeof record.effective_until === 'string' ? record.effective_until : null,
    })
    rulesByClass.set(record.class_id, list)
  }

  const exceptionByKey = new Map<string, ExceptionRow>()
  for (const row of exceptions ?? []) {
    const record = asRecord(row)
    if (!record || typeof record.class_id !== 'string' || typeof record.exception_date !== 'string') continue
    exceptionByKey.set(`${record.class_id}:${record.exception_date}`, {
      isCancelled: record.is_cancelled === true,
      overrideStartTime: typeof record.override_start_time === 'string' ? record.override_start_time : null,
    })
  }

  const alarms: UpcomingClassAlarm[] = []
  const seen = new Set<string>()

  for (const pair of pairs) {
    const timeZone = zoneByClass.get(pair.classId)
    const classRules = rulesByClass.get(pair.classId) ?? []
    if (!timeZone || classRules.length === 0) continue
    const childName = nameByChild.get(pair.childId) ?? 'your swimmer'

    let dateKey = formatCalendarDateKey(new Date(), timeZone)
    for (let day = 0; day < HORIZON_DAYS; day += 1) {
      const exception = exceptionByKey.get(`${pair.classId}:${dateKey}`)
      if (!exception?.isCancelled) {
        for (const rule of classRules) {
          if (rule.dayOfWeek !== isoDayOfWeek(dateKey)) continue
          if (dateKey < rule.effectiveFrom) continue
          if (rule.effectiveUntil && dateKey > rule.effectiveUntil) continue
          const key = `${pair.classId}:${pair.childId}:${dateKey}`
          if (seen.has(key)) continue
          seen.add(key)
          alarms.push({
            classId: pair.classId,
            childId: pair.childId,
            childName,
            sessionDate: dateKey,
            startTime: exception?.overrideStartTime ?? rule.startTime,
            timeZone,
          })
        }
      }
      dateKey = addCalendarDays(dateKey, 1, timeZone)
    }
  }

  return alarms
}
