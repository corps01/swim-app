import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'

const WINDOW_MS = 60 * 60 * 1000
const ONESIGNAL_URL = 'https://onesignal.com/api/v1/notifications'

interface DueReminder {
  userId: string
  childId: string
  childName: string
  classId: string
  sessionDate: string
  timeLabel: string
  playerId: string | null
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function authorized(req: Request): boolean {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const cronSecret = Deno.env.get('FORM_REMINDERS_CRON_SECRET') ?? ''
  if (serviceKey && token === serviceKey) return true
  if (cronSecret && token === cronSecret) return true
  return false
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
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0)
  const wallAsUtc = Date.UTC(read('year'), read('month') - 1, read('day'), read('hour'), read('minute'), read('second'))
  return wallAsUtc - Math.floor(date.getTime() / 1000) * 1000
}

function zonedWallTimeToUtc(dateKey: string, time: string, timeZone: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  const [hour, minute, second] = time.split(':').map(Number)
  const guess = Date.UTC(year, month - 1, day, hour, minute, second || 0)
  let utc = guess - timezoneOffsetMs(new Date(guess), timeZone)
  utc = guess - timezoneOffsetMs(new Date(utc), timeZone)
  return new Date(utc)
}

function formatDateKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${read('year')}-${read('month')}-${read('day')}`
}

function addDays(dateKey: string, timeZone: string): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  const probe = new Date(Date.UTC(year, month - 1, day + 1, 12))
  return formatDateKey(probe, timeZone)
}

function isoDayOfWeek(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number)
  const weekday = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay()
  return weekday === 0 ? 7 : weekday
}

async function findDueReminders(supabase: SupabaseClient, now: Date): Promise<DueReminder[]> {
  const { data: budQuestions, error: questionError } = await supabase
    .from('question_bank')
    .select('id')
    .eq('category', 'isr_buds')
  if (questionError) throw new Error(questionError.message)
  const questionIds = (budQuestions ?? [])
    .map((row) => asRecord(row)?.id)
    .filter((id): id is string => typeof id === 'string')
  if (questionIds.length === 0) return []

  const { data: templateLinks, error: linkError } = await supabase
    .from('form_template_questions')
    .select('template_id')
    .in('question_id', questionIds)
  if (linkError) throw new Error(linkError.message)
  const templateIds = [...new Set(
    (templateLinks ?? [])
      .map((row) => asRecord(row)?.template_id)
      .filter((id): id is string => typeof id === 'string'),
  )]
  if (templateIds.length === 0) return []

  const { data: templates, error: templateError } = await supabase
    .from('form_templates')
    .select('id')
    .in('id', templateIds)
    .eq('is_active', true)
  if (templateError) throw new Error(templateError.message)
  const activeTemplateIds = (templates ?? [])
    .map((row) => asRecord(row)?.id)
    .filter((id): id is string => typeof id === 'string')
  if (activeTemplateIds.length === 0) return []

  const { data: classForms, error: formError } = await supabase
    .from('class_forms')
    .select('class_id, template_id')
    .in('template_id', activeTemplateIds)
  if (formError) throw new Error(formError.message)

  const templatesByClass = new Map<string, string[]>()
  for (const row of classForms ?? []) {
    const record = asRecord(row)
    if (!record || typeof record.class_id !== 'string' || typeof record.template_id !== 'string') continue
    const list = templatesByClass.get(record.class_id) ?? []
    list.push(record.template_id)
    templatesByClass.set(record.class_id, list)
  }
  const classIds = [...templatesByClass.keys()]
  if (classIds.length === 0) return []

  const since = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()
  const [classesResult, rulesResult, exceptionsResult, enrollmentsResult, submissionsResult] = await Promise.all([
    supabase.from('classes').select('id, timezone').in('id', classIds),
    supabase
      .from('class_schedule_rules')
      .select('class_id, day_of_week, start_time, effective_from, effective_until')
      .in('class_id', classIds),
    supabase
      .from('class_schedule_exceptions')
      .select('class_id, exception_date, is_cancelled, override_start_time')
      .in('class_id', classIds),
    supabase
      .from('child_instructor_relationships')
      .select('child_id, class_id, status')
      .in('class_id', classIds)
      .eq('status', 'active'),
    supabase
      .from('form_submissions')
      .select('child_id, class_id, template_id, signed_at')
      .in('class_id', classIds)
      .gte('signed_at', since),
  ])
  for (const result of [classesResult, rulesResult, exceptionsResult, enrollmentsResult, submissionsResult]) {
    if (result.error) throw new Error(result.error.message)
  }

  const zoneByClass = new Map<string, string>()
  for (const row of classesResult.data ?? []) {
    const record = asRecord(row)
    if (record && typeof record.id === 'string' && typeof record.timezone === 'string') {
      zoneByClass.set(record.id, record.timezone)
    }
  }

  const windowEnd = now.getTime() + WINDOW_MS
  const dueSessions: Array<{ classId: string; sessionDate: string; startsAt: Date; timeZone: string }> = []

  for (const classId of classIds) {
    const timeZone = zoneByClass.get(classId)
    if (!timeZone) continue
    let dateKey = formatDateKey(now, timeZone)
    for (let day = 0; day < 2; day += 1) {
      const exception = (exceptionsResult.data ?? []).map(asRecord).find((record) =>
        record?.class_id === classId && record.exception_date === dateKey,
      )
      const cancelled = exception?.is_cancelled === true
      if (!cancelled) {
        for (const raw of rulesResult.data ?? []) {
          const rule = asRecord(raw)
          if (!rule || rule.class_id !== classId) continue
          if (rule.day_of_week !== isoDayOfWeek(dateKey)) continue
          if (typeof rule.effective_from === 'string' && dateKey < rule.effective_from) continue
          if (typeof rule.effective_until === 'string' && dateKey > rule.effective_until) continue
          const startTime = typeof exception?.override_start_time === 'string'
            ? exception.override_start_time
            : rule.start_time
          if (typeof startTime !== 'string') continue
          const startsAt = zonedWallTimeToUtc(dateKey, startTime, timeZone)
          const startsMs = startsAt.getTime()
          if (startsMs > now.getTime() && startsMs <= windowEnd) {
            dueSessions.push({ classId, sessionDate: dateKey, startsAt, timeZone })
          }
        }
      }
      dateKey = addDays(dateKey, timeZone)
    }
  }
  if (dueSessions.length === 0) return []

  const dueClassIds = new Set(dueSessions.map((session) => session.classId))
  const childIds = new Set<string>()
  const enrollments: Array<{ childId: string; classId: string }> = []
  for (const row of enrollmentsResult.data ?? []) {
    const record = asRecord(row)
    if (!record || typeof record.child_id !== 'string' || typeof record.class_id !== 'string') continue
    if (!dueClassIds.has(record.class_id)) continue
    childIds.add(record.child_id)
    enrollments.push({ childId: record.child_id, classId: record.class_id })
  }
  if (childIds.size === 0) return []

  const ids = [...childIds]
  const [childrenResult, parentsResult] = await Promise.all([
    supabase.from('children').select('id, first_name, last_name').in('id', ids),
    supabase.from('parent_child_relationships').select('parent_id, child_id').in('child_id', ids),
  ])
  if (childrenResult.error) throw new Error(childrenResult.error.message)
  if (parentsResult.error) throw new Error(parentsResult.error.message)

  const nameByChild = new Map<string, string>()
  for (const row of childrenResult.data ?? []) {
    const record = asRecord(row)
    if (!record || typeof record.id !== 'string') continue
    const first = typeof record.first_name === 'string' ? record.first_name.trim() : ''
    const last = typeof record.last_name === 'string' ? record.last_name.trim() : ''
    nameByChild.set(record.id, `${first} ${last}`.trim() || 'your swimmer')
  }

  const parentsByChild = new Map<string, string[]>()
  const parentIds = new Set<string>()
  for (const row of parentsResult.data ?? []) {
    const record = asRecord(row)
    if (!record || typeof record.parent_id !== 'string' || typeof record.child_id !== 'string') continue
    const list = parentsByChild.get(record.child_id) ?? []
    list.push(record.parent_id)
    parentsByChild.set(record.child_id, list)
    parentIds.add(record.parent_id)
  }
  if (parentIds.size === 0) return []

  const parentIdList = [...parentIds]
  const [profilesResult, prefsResult] = await Promise.all([
    supabase.from('profiles').select('id, onesignal_player_id').in('id', parentIdList),
    supabase
      .from('notification_preferences')
      .select('user_id, push_notifications_enabled')
      .in('user_id', parentIdList),
  ])
  if (profilesResult.error) throw new Error(profilesResult.error.message)
  if (prefsResult.error) throw new Error(prefsResult.error.message)

  const playerByUser = new Map<string, string | null>()
  for (const row of profilesResult.data ?? []) {
    const record = asRecord(row)
    if (!record || typeof record.id !== 'string') continue
    playerByUser.set(record.id, typeof record.onesignal_player_id === 'string' ? record.onesignal_player_id : null)
  }
  const pushOff = new Set<string>()
  for (const row of prefsResult.data ?? []) {
    const record = asRecord(row)
    if (record && typeof record.user_id === 'string' && record.push_notifications_enabled === false) {
      pushOff.add(record.user_id)
    }
  }

  const signedToday = new Set<string>()
  for (const row of submissionsResult.data ?? []) {
    const record = asRecord(row)
    if (
      !record ||
      typeof record.child_id !== 'string' ||
      typeof record.class_id !== 'string' ||
      typeof record.template_id !== 'string' ||
      typeof record.signed_at !== 'string'
    ) {
      continue
    }
    const timeZone = zoneByClass.get(record.class_id)
    if (!timeZone) continue
    const signedDate = formatDateKey(new Date(record.signed_at), timeZone)
    signedToday.add(`${record.child_id}:${record.class_id}:${record.template_id}:${signedDate}`)
  }

  const reminders: DueReminder[] = []
  const seen = new Set<string>()
  for (const session of dueSessions) {
    const templateIdsForClass = templatesByClass.get(session.classId) ?? []
    for (const enrollment of enrollments) {
      if (enrollment.classId !== session.classId) continue
      const missing = templateIdsForClass.some(
        (templateId) => !signedToday.has(`${enrollment.childId}:${session.classId}:${templateId}:${session.sessionDate}`),
      )
      if (!missing) continue
      for (const parentId of parentsByChild.get(enrollment.childId) ?? []) {
        if (pushOff.has(parentId)) continue
        const key = `${parentId}:${enrollment.childId}:${session.classId}:${session.sessionDate}`
        if (seen.has(key)) continue
        seen.add(key)
        const timeLabel = new Intl.DateTimeFormat('en-US', {
          timeZone: session.timeZone,
          hour: 'numeric',
          minute: '2-digit',
        }).format(session.startsAt)
        reminders.push({
          userId: parentId,
          childId: enrollment.childId,
          childName: nameByChild.get(enrollment.childId) ?? 'your swimmer',
          classId: session.classId,
          sessionDate: session.sessionDate,
          timeLabel,
          playerId: playerByUser.get(parentId) ?? null,
        })
      }
    }
  }
  return reminders
}

async function dispatchReminder(
  supabase: SupabaseClient,
  reminder: DueReminder,
  appId: string,
  restKey: string,
): Promise<'sent' | 'failed' | 'skipped'> {
  const { data: existing, error: readError } = await supabase
    .from('form_reminders_log')
    .select('id, status, error')
    .eq('user_id', reminder.userId)
    .eq('child_id', reminder.childId)
    .eq('class_id', reminder.classId)
    .eq('session_date', reminder.sessionDate)
    .maybeSingle()
  if (readError) throw new Error(readError.message)

  const existingRow = asRecord(existing)
  const status = existingRow?.status
  const previousError = typeof existingRow?.error === 'string' ? existingRow.error : ''
  if (status === 'sent') return 'skipped'
  if (status === 'failed' && previousError.startsWith('missing onesignal')) return 'skipped'

  if (!reminder.playerId) {
    const failed = {
      user_id: reminder.userId,
      child_id: reminder.childId,
      class_id: reminder.classId,
      session_date: reminder.sessionDate,
      status: 'failed',
      onesignal_player_id: null,
      error: 'missing onesignal_player_id',
    }
    if (existingRow?.id) {
      await supabase.from('form_reminders_log').update(failed).eq('id', existingRow.id)
    } else {
      await supabase.from('form_reminders_log').insert(failed)
    }
    return 'failed'
  }

  const pending = {
    user_id: reminder.userId,
    child_id: reminder.childId,
    class_id: reminder.classId,
    session_date: reminder.sessionDate,
    status: 'pending',
    onesignal_player_id: reminder.playerId,
    error: null,
  }
  const write = existingRow?.id
    ? await supabase.from('form_reminders_log').update(pending).eq('id', existingRow.id)
    : await supabase.from('form_reminders_log').insert(pending)
  if (write.error) throw new Error(write.error.message)

  const response = await fetch(ONESIGNAL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${restKey}`,
    },
    body: JSON.stringify({
      app_id: appId,
      include_player_ids: [reminder.playerId],
      headings: { en: `Swim Class Today — ${reminder.childName}` },
      contents: {
        en: `Class starts at ${reminder.timeLabel}. Please complete today's BUDS health check!`,
      },
    }),
  })

  const payload = await response.json().catch(() => ({})) as { id?: string; errors?: unknown }
  const notificationId = typeof payload.id === 'string' ? payload.id : null
  const failed = !response.ok || !notificationId
  await supabase
    .from('form_reminders_log')
    .update({
      status: failed ? 'failed' : 'sent',
      onesignal_notification_id: notificationId,
      error: failed ? JSON.stringify(payload.errors ?? payload).slice(0, 500) : null,
    })
    .eq('user_id', reminder.userId)
    .eq('child_id', reminder.childId)
    .eq('class_id', reminder.classId)
    .eq('session_date', reminder.sessionDate)

  return failed ? 'failed' : 'sent'
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405)
  if (!authorized(req)) return json({ error: 'Unauthorized' }, 401)

  const appId = Deno.env.get('ONESIGNAL_APP_ID') ?? ''
  const restKey = Deno.env.get('ONESIGNAL_REST_KEY') ?? ''
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!appId || !restKey || !supabaseUrl || !serviceKey) {
    return json({ error: 'Missing ONESIGNAL_APP_ID, ONESIGNAL_REST_KEY, or Supabase service credentials' }, 500)
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    const reminders = await findDueReminders(supabase, new Date())
    const counts = { sent: 0, failed: 0, skipped: 0 }
    for (const reminder of reminders) {
      const result = await dispatchReminder(supabase, reminder, appId, restKey)
      counts[result] += 1
    }
    return json({ ok: true, ...counts })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Reminder run failed'
    return json({ error: message }, 500)
  }
})
