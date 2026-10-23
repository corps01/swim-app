import { formatAppError } from '../errors'
import { getSupabaseClient } from '../supabase'
import { addCalendarDays, formatCalendarDateKey } from '../timeZone/calendar'
import { POOL_TIMEZONE_API_FALLBACK } from '../timeZone/pool'
import { isNotifyBeforeHours, type NotificationPreferences } from '../../types/settings'
import type { UserRole } from '../../types/database'

export interface UpcomingClassReminder {
  userId: string
  role: UserRole
  notifyBeforeHours: number
  classId: string
  className: string
  childId: string | null
  sessionDate: string
  sessionStartsAt: string
  reminderDueAt: string
  timeZone: string
}

interface ClassRow {
  id: string
  name: string
  timezone: string
  instructorId: string
}

interface RuleRow {
  classId: string
  dayOfWeek: number
  startTime: string
  effectiveFrom: string
  effectiveUntil: string | null
}

interface ExceptionRow {
  classId: string
  date: string
  isCancelled: boolean
  overrideStartTime: string | null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function timezoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0)
  const wallAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return wallAsUtc - Math.floor(date.getTime() / 1000) * 1000
}

/** Converts a pool-local date + time (HH:MM:SS) to a UTC instant. */
function zonedStartToUtc(dateKey: string, time: string, timeZone: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  const [hour, minute, second] = time.split(':').map(Number)
  const guess = Date.UTC(year, month - 1, day, hour, minute, second || 0)
  let utc = guess - timezoneOffsetMs(new Date(guess), timeZone)
  utc = guess - timezoneOffsetMs(new Date(utc), timeZone)
  return new Date(utc)
}

function isoDayOfWeek(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number)
  const weekday = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay()
  return weekday === 0 ? 7 : weekday
}

function parsePreferences(row: Record<string, unknown>): NotificationPreferences | null {
  if (typeof row.user_id !== 'string' || !isNotifyBeforeHours(row.notify_before_hours)) return null
  if (row.push_notifications_enabled === false) return null
  // Daily digests are handled by a summary job, not per-class reminders.
  if (row.reminder_frequency !== 'per_class') return null
  return {
    userId: row.user_id,
    notifyBeforeHours: row.notify_before_hours,
    pushNotificationsEnabled: true,
    dailyAgendaSummaryEnabled: row.daily_agenda_summary_enabled === true,
    reminderFrequency: 'per_class',
  }
}

/**
 * Users whose class reminder falls inside the next `windowMinutes`.
 *
 * Reads saved preferences plus class schedule rules/exceptions, expanding the
 * next `horizonDays` in each pool's timezone. Intended for a scheduler running
 * with a service-role client; with a normal signed-in client, RLS limits the
 * rows to that user's own data. Nothing is sent here — the caller dispatches.
 */
export async function fetchUpcomingClassReminders(options?: {
  now?: Date
  windowMinutes?: number
  horizonDays?: number
}): Promise<UpcomingClassReminder[]> {
  const now = options?.now ?? new Date()
  const windowEnd = new Date(now.getTime() + (options?.windowMinutes ?? 60) * 60_000)
  const horizonDays = options?.horizonDays ?? 3
  const supabase = getSupabaseClient()

  const [prefsResult, profilesResult, classesResult, rulesResult, exceptionsResult, enrollmentsResult, parentLinksResult] =
    await Promise.all([
      supabase
        .from('notification_preferences')
        .select(
          'user_id, notify_before_hours, push_notifications_enabled, daily_agenda_summary_enabled, reminder_frequency',
        )
        .eq('push_notifications_enabled', true)
        .eq('reminder_frequency', 'per_class'),
      supabase.from('profiles').select('id, role'),
      supabase.from('classes').select('id, name, timezone, instructor_id'),
      supabase
        .from('class_schedule_rules')
        .select('class_id, day_of_week, start_time, effective_from, effective_until'),
      supabase
        .from('class_schedule_exceptions')
        .select('class_id, exception_date, is_cancelled, override_start_time'),
      supabase
        .from('child_instructor_relationships')
        .select('child_id, instructor_id, class_id, status')
        .eq('status', 'active'),
      supabase.from('parent_child_relationships').select('parent_id, child_id'),
    ])

  for (const result of [
    prefsResult,
    profilesResult,
    classesResult,
    rulesResult,
    exceptionsResult,
    enrollmentsResult,
    parentLinksResult,
  ]) {
    if (result.error) throw new Error(formatAppError(result.error))
  }

  const roleByUser = new Map<string, UserRole>()
  for (const row of profilesResult.data ?? []) {
    const record = asRecord(row)
    if (record && typeof record.id === 'string') {
      roleByUser.set(record.id, record.role === 'instructor' ? 'instructor' : 'parent')
    }
  }

  const preferences: NotificationPreferences[] = []
  for (const row of prefsResult.data ?? []) {
    const record = asRecord(row)
    const parsed = record ? parsePreferences(record) : null
    if (parsed && roleByUser.has(parsed.userId)) preferences.push(parsed)
  }
  if (preferences.length === 0) return []

  const classById = new Map<string, ClassRow>()
  for (const row of classesResult.data ?? []) {
    const record = asRecord(row)
    if (!record || typeof record.id !== 'string' || typeof record.instructor_id !== 'string') continue
    classById.set(record.id, {
      id: record.id,
      name: typeof record.name === 'string' ? record.name : 'Class',
      timezone:
        typeof record.timezone === 'string' && record.timezone ? record.timezone : POOL_TIMEZONE_API_FALLBACK,
      instructorId: record.instructor_id,
    })
  }

  const rulesByClass = new Map<string, RuleRow[]>()
  for (const row of rulesResult.data ?? []) {
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

  const exceptionByClassDate = new Map<string, ExceptionRow>()
  for (const row of exceptionsResult.data ?? []) {
    const record = asRecord(row)
    if (!record || typeof record.class_id !== 'string' || typeof record.exception_date !== 'string') continue
    exceptionByClassDate.set(`${record.class_id}:${record.exception_date}`, {
      classId: record.class_id,
      date: record.exception_date,
      isCancelled: record.is_cancelled === true,
      overrideStartTime: typeof record.override_start_time === 'string' ? record.override_start_time : null,
    })
  }

  // classId -> children enrolled (for parents), instructorId -> classIds (for instructors)
  const childrenByClass = new Map<string, string[]>()
  const classIdsByInstructor = new Map<string, string[]>()
  for (const row of enrollmentsResult.data ?? []) {
    const record = asRecord(row)
    if (!record || typeof record.class_id !== 'string') continue
    if (typeof record.child_id === 'string') {
      const list = childrenByClass.get(record.class_id) ?? []
      list.push(record.child_id)
      childrenByClass.set(record.class_id, list)
    }
    if (typeof record.instructor_id === 'string') {
      const list = classIdsByInstructor.get(record.instructor_id) ?? []
      if (!list.includes(record.class_id)) list.push(record.class_id)
      classIdsByInstructor.set(record.instructor_id, list)
    }
  }

  const childIdsByParent = new Map<string, string[]>()
  for (const row of parentLinksResult.data ?? []) {
    const record = asRecord(row)
    if (!record || typeof record.parent_id !== 'string' || typeof record.child_id !== 'string') continue
    const list = childIdsByParent.get(record.parent_id) ?? []
    list.push(record.child_id)
    childIdsByParent.set(record.parent_id, list)
  }

  const reminders: UpcomingClassReminder[] = []
  const seen = new Set<string>()

  for (const preference of preferences) {
    const role = roleByUser.get(preference.userId)
    if (!role) continue
    const classIds =
      role === 'instructor'
        ? (classIdsByInstructor.get(preference.userId) ?? [])
        : [...classById.keys()].filter((classId) =>
            (childrenByClass.get(classId) ?? []).some((childId) =>
              (childIdsByParent.get(preference.userId) ?? []).includes(childId),
            ),
          )

    for (const classId of classIds) {
      const classRow = classById.get(classId)
      const rules = rulesByClass.get(classId) ?? []
      if (!classRow || rules.length === 0) continue

      const childIds =
        role === 'instructor'
          ? [null]
          : (childrenByClass.get(classId) ?? []).filter((childId) =>
              (childIdsByParent.get(preference.userId) ?? []).includes(childId),
            )

      let dateKey = formatCalendarDateKey(now, classRow.timezone)
      for (let day = 0; day < horizonDays; day += 1) {
        const exception = exceptionByClassDate.get(`${classId}:${dateKey}`)
        if (!exception?.isCancelled) {
          for (const rule of rules) {
            if (rule.dayOfWeek !== isoDayOfWeek(dateKey)) continue
            if (dateKey < rule.effectiveFrom) continue
            if (rule.effectiveUntil && dateKey > rule.effectiveUntil) continue
            const startsAt = zonedStartToUtc(dateKey, exception?.overrideStartTime ?? rule.startTime, classRow.timezone)
            const reminderDueAt = new Date(startsAt.getTime() - preference.notifyBeforeHours * 3_600_000)
            if (reminderDueAt < now || reminderDueAt >= windowEnd) continue
            for (const childId of childIds) {
              const key = `${preference.userId}:${classId}:${childId ?? ''}:${startsAt.toISOString()}`
              if (seen.has(key)) continue
              seen.add(key)
              reminders.push({
                userId: preference.userId,
                role,
                notifyBeforeHours: preference.notifyBeforeHours,
                classId,
                className: classRow.name,
                childId,
                sessionDate: dateKey,
                sessionStartsAt: startsAt.toISOString(),
                reminderDueAt: reminderDueAt.toISOString(),
                timeZone: classRow.timezone,
              })
            }
          }
        }
        dateKey = addCalendarDays(dateKey, 1, classRow.timezone)
      }
    }
  }

  return reminders.sort((a, b) => a.reminderDueAt.localeCompare(b.reminderDueAt))
}
