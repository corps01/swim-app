import {
  evaluateBudsFitness,
  fitnessAnswersFromSnapshots,
  formatClearanceClock,
  type DeckFitnessStatus,
  type ParentClearanceStatus,
} from '../budsFitness'
import { formatAppError, throwIfSupabaseError } from '../errors'
import { ISR_BUDS_CATEGORY } from '../formQuestions'
import { getSupabaseClient } from '../supabase'
import {
  addCalendarDays,
  calendarWeekdayLong,
  formatCalendarDateKey,
  isoWeekdayFromDateKey,
} from '../timeZone/calendar'
import { POOL_TIMEZONE_API_FALLBACK } from '../timeZone/pool'
import { zonedWallTimeToUtc } from '../timeZone/zonedTime'
import { formatTime12h } from '../classSchedule'
import type { AnswerSnapshot } from '../../types/questionnaire'

export interface TodayClearance {
  childId: string
  swimmerName: string
  classId: string
  className: string
  templateId: string
  timeZone: string
  sessionDate: string
  classTimeLabel: string
  /** UTC instant the lesson starts, used for the parent countdown. */
  classStartsAt: string
  status: ParentClearanceStatus
  clearanceTimeLabel: string | null
  /** Short reasons behind the status, such as a reported symptom. */
  reasons: string[]
}

export interface DeckFitness {
  childId: string
  status: DeckFitnessStatus
  canOverride: boolean
  /** One-line reason shown beside the deck badge. */
  detail: string | null
}

interface ClearanceEnrollment {
  childId: string
  swimmerName: string
  classId: string
}

interface ScheduleRule {
  classId: string
  dayOfWeek: number
  startTime: string
  endTime: string | null
  effectiveFrom: string
  effectiveUntil: string | null
}

interface ScheduleException {
  classId: string
  date: string
  isCancelled: boolean
  overrideStartTime: string | null
  overrideEndTime: string | null
}

function dateOnly(value: unknown): string {
  return typeof value === 'string' ? value.slice(0, 10) : ''
}

function missingSchema(error: unknown, token: string): boolean {
  if (!error || typeof error !== 'object') return false
  const message = String((error as { message?: string }).message ?? '').toLowerCase()
  return message.includes(token.toLowerCase())
}

function schemaHint(error: unknown): never {
  const message = formatAppError(error).trim().replace(/\.+$/, '')
  if (missingSchema(error, 'session_date') || missingSchema(error, 'buds_deck_overrides')) {
    throw new Error(`${message}. Run docs/sql/10-buds-fitness.sql in the Supabase SQL editor.`)
  }
  throw new Error(message)
}

async function loadBudsTemplateIds(classIds: string[]): Promise<Map<string, string[]>> {
  const supabase = getSupabaseClient()
  const [bankResult, linksResult] = await Promise.all([
    supabase.from('question_bank').select('id').eq('category', ISR_BUDS_CATEGORY),
    supabase
      .from('class_forms')
      .select('class_id, template_id, form_templates(is_active, form_template_questions(question_id))')
      .in('class_id', classIds),
  ])
  throwIfSupabaseError(bankResult.error)
  throwIfSupabaseError(linksResult.error)

  const budsQuestionIds = new Set<string>()
  for (const row of bankResult.data ?? []) {
    const id = (row as { id?: unknown }).id
    if (typeof id === 'string') budsQuestionIds.add(id)
  }

  const templatesByClass = new Map<string, string[]>()
  for (const row of linksResult.data ?? []) {
    const record = row as Record<string, unknown>
    if (typeof record.class_id !== 'string' || typeof record.template_id !== 'string') continue
    const template = Array.isArray(record.form_templates) ? record.form_templates[0] : record.form_templates
    if (!template || typeof template !== 'object') continue
    if ((template as { is_active?: unknown }).is_active === false) continue
    const links = (template as { form_template_questions?: unknown }).form_template_questions
    const usesBuds = Array.isArray(links)
      && links.some((link) => {
        const questionId = (link as { question_id?: unknown }).question_id
        return typeof questionId === 'string' && budsQuestionIds.has(questionId)
      })
    if (!usesBuds) continue
    const list = templatesByClass.get(record.class_id) ?? []
    list.push(record.template_id)
    templatesByClass.set(record.class_id, list)
  }
  return templatesByClass
}

async function loadSchedule(
  classIds: string[],
): Promise<{ rules: ScheduleRule[]; exceptions: ScheduleException[] }> {
  const supabase = getSupabaseClient()
  const [rulesResult, exceptionsResult] = await Promise.all([
    supabase
      .from('class_schedule_rules')
      .select('class_id, day_of_week, start_time, end_time, effective_from, effective_until')
      .in('class_id', classIds),
    supabase
      .from('class_schedule_exceptions')
      .select('class_id, exception_date, is_cancelled, override_start_time, override_end_time')
      .in('class_id', classIds),
  ])
  throwIfSupabaseError(rulesResult.error)
  throwIfSupabaseError(exceptionsResult.error)

  const rules: ScheduleRule[] = (rulesResult.data ?? []).flatMap((row) => {
    const record = row as Record<string, unknown>
    if (typeof record.class_id !== 'string' || typeof record.day_of_week !== 'number') return []
    if (typeof record.start_time !== 'string' || typeof record.effective_from !== 'string') return []
    return [
      {
        classId: record.class_id,
        dayOfWeek: record.day_of_week,
        startTime: record.start_time,
        endTime: typeof record.end_time === 'string' ? record.end_time : null,
        effectiveFrom: dateOnly(record.effective_from),
        effectiveUntil: record.effective_until ? dateOnly(record.effective_until) : null,
      },
    ]
  })

  const exceptions: ScheduleException[] = (exceptionsResult.data ?? []).flatMap((row) => {
    const record = row as Record<string, unknown>
    if (typeof record.class_id !== 'string') return []
    const date = dateOnly(record.exception_date)
    if (!date) return []
    return [
      {
        classId: record.class_id,
        date,
        isCancelled: record.is_cancelled !== false,
        overrideStartTime: typeof record.override_start_time === 'string' ? record.override_start_time : null,
        overrideEndTime: typeof record.override_end_time === 'string' ? record.override_end_time : null,
      },
    ]
  })

  return { rules, exceptions }
}

function slotForDay(
  classId: string,
  dateKey: string,
  rules: ScheduleRule[],
  exceptions: ScheduleException[],
): { startTime: string; endTime: string | null } | null {
  const exception = exceptions.find((row) => row.classId === classId && row.date === dateKey)
  if (exception?.isCancelled) return null
  if (exception?.overrideStartTime) {
    return { startTime: exception.overrideStartTime, endTime: exception.overrideEndTime }
  }

  const weekday = isoWeekdayFromDateKey(dateKey)
  const matches = rules
    .filter((rule) => {
      if (rule.classId !== classId || rule.dayOfWeek !== weekday) return false
      if (dateKey < rule.effectiveFrom) return false
      if (rule.effectiveUntil && dateKey > rule.effectiveUntil) return false
      return true
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
  const rule = matches[0]
  return rule ? { startTime: rule.startTime, endTime: rule.endTime } : null
}

function startTimeForDay(
  classId: string,
  dateKey: string,
  rules: ScheduleRule[],
  exceptions: ScheduleException[],
): string | null {
  return slotForDay(classId, dateKey, rules, exceptions)?.startTime ?? null
}

interface DaySubmission {
  childId: string
  classId: string
  templateId: string
  signedAt: string
  sessionDate: string | null
  answers: AnswerSnapshot[]
}

function parseAnswers(value: unknown): AnswerSnapshot[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const row = item as Record<string, unknown>
    if (typeof row.question_text !== 'string' || typeof row.answer !== 'string') return []
    const inputType = row.input_type
    if (inputType !== 'text' && inputType !== 'textarea' && inputType !== 'yes_no' && inputType !== 'select') {
      return []
    }
    return [{ question_text: row.question_text, input_type: inputType, answer: row.answer }]
  })
}

async function loadSubmissions(classIds: string[], childIds: string[], templateIds: string[]): Promise<DaySubmission[]> {
  if (classIds.length === 0 || childIds.length === 0 || templateIds.length === 0) return []
  const supabase = getSupabaseClient()
  const withSession = await supabase
    .from('form_submissions')
    .select('child_id, class_id, template_id, signed_at, answers_json, session_date')
    .in('class_id', classIds)
    .in('child_id', childIds)
    .in('template_id', templateIds)

  const rows = withSession.error && missingSchema(withSession.error, 'session_date')
    ? await supabase
        .from('form_submissions')
        .select('child_id, class_id, template_id, signed_at, answers_json')
        .in('class_id', classIds)
        .in('child_id', childIds)
        .in('template_id', templateIds)
    : withSession

  if (rows.error) schemaHint(rows.error)

  return (rows.data ?? []).flatMap((row) => {
    const record = row as Record<string, unknown>
    if (
      typeof record.child_id !== 'string' ||
      typeof record.class_id !== 'string' ||
      typeof record.template_id !== 'string' ||
      typeof record.signed_at !== 'string'
    ) {
      return []
    }
    return [
      {
        childId: record.child_id,
        classId: record.class_id,
        templateId: record.template_id,
        signedAt: record.signed_at,
        sessionDate: typeof record.session_date === 'string' ? dateOnly(record.session_date) : null,
        answers: parseAnswers(record.answers_json),
      },
    ]
  })
}

function submissionForDay(rows: DaySubmission[], childId: string, classId: string, dateKey: string, timeZone: string) {
  const matches = rows.filter((row) => {
    if (row.childId !== childId || row.classId !== classId) return false
    if (row.sessionDate) return row.sessionDate === dateKey
    const signed = new Date(row.signedAt)
    return !Number.isNaN(signed.getTime()) && formatCalendarDateKey(signed, timeZone) === dateKey
  })
  matches.sort((a, b) => {
    if (Boolean(a.sessionDate) !== Boolean(b.sessionDate)) return a.sessionDate ? -1 : 1
    return b.signedAt.localeCompare(a.signedAt)
  })
  return matches[0] ?? null
}

function decideStatus(
  submission: DaySubmission | null,
  classStart: Date,
  timeZone: string,
): { status: ParentClearanceStatus; clearanceTimeLabel: string | null; reasons: string[] } {
  if (!submission) return { status: 'MISSING', clearanceTimeLabel: null, reasons: [] }
  const parsed = fitnessAnswersFromSnapshots(submission.answers)
  const evaluation = evaluateBudsFitness(parsed, classStart, timeZone)
  const clearanceTimeLabel = evaluation.clearanceAt ? formatClearanceClock(evaluation.clearanceAt, timeZone) : null
  const reasons: string[] = []
  if (parsed.fever) reasons.push('Fever since the last lesson')
  if (parsed.vomiting) reasons.push('Vomiting since the last lesson')
  if (parsed.diarrhea) reasons.push('Diarrhea since the last lesson')
  if (evaluation.status === 'HOLD_DIET') {
    reasons.push(
      clearanceTimeLabel
        ? `Last meal is inside 2 hours of class. Clear for water at ${clearanceTimeLabel}`
        : 'Last meal is inside 2 hours of class',
    )
  }
  if (evaluation.status === 'FLAGGED_CAUTION') {
    reasons.push(
      parsed.sleepHours != null
        ? `${parsed.sleepHours} hours of sleep, under the 6-hour line`
        : 'Under 6 hours of sleep',
    )
  }
  return { status: evaluation.status, clearanceTimeLabel, reasons }
}

/** Clearance cards for swimmers who have a lesson today in the pool's timezone. */
export async function fetchTodayClearances(enrollments: ClearanceEnrollment[]): Promise<TodayClearance[]> {
  const pairs = enrollments.filter((row) => row.childId && row.classId)
  const classIds = [...new Set(pairs.map((row) => row.classId))]
  const childIds = [...new Set(pairs.map((row) => row.childId))]
  if (classIds.length === 0) return []

  const supabase = getSupabaseClient()
  const { data: classRows, error: classError } = await supabase
    .from('classes')
    .select('id, name, timezone')
    .in('id', classIds)
  throwIfSupabaseError(classError)

  const classById = new Map<string, { name: string; timeZone: string }>()
  for (const row of classRows ?? []) {
    const record = row as Record<string, unknown>
    if (typeof record.id !== 'string') continue
    classById.set(record.id, {
      name: typeof record.name === 'string' ? record.name : 'Class',
      timeZone: typeof record.timezone === 'string' && record.timezone ? record.timezone : POOL_TIMEZONE_API_FALLBACK,
    })
  }

  const [templatesByClass, schedule] = await Promise.all([
    loadBudsTemplateIds(classIds),
    loadSchedule(classIds),
  ])
  const templateIds = [...new Set([...templatesByClass.values()].flat())]
  const submissions = await loadSubmissions(classIds, childIds, templateIds)
  const now = new Date()
  const cards: TodayClearance[] = []

  for (const pair of pairs) {
    const swimClass = classById.get(pair.classId)
    const templateId = templatesByClass.get(pair.classId)?.[0]
    if (!swimClass || !templateId) continue
    const sessionDate = formatCalendarDateKey(now, swimClass.timeZone)
    const startTime = startTimeForDay(pair.classId, sessionDate, schedule.rules, schedule.exceptions)
    if (!startTime) continue
    const classStart = zonedWallTimeToUtc(sessionDate, startTime, swimClass.timeZone)
    const submission = submissionForDay(submissions, pair.childId, pair.classId, sessionDate, swimClass.timeZone)
    const decision = decideStatus(submission, classStart, swimClass.timeZone)
    cards.push({
      childId: pair.childId,
      swimmerName: pair.swimmerName,
      classId: pair.classId,
      className: swimClass.name,
      templateId,
      timeZone: swimClass.timeZone,
      sessionDate,
      classTimeLabel: formatTime12h(startTime),
      classStartsAt: classStart.toISOString(),
      status: decision.status,
      clearanceTimeLabel: decision.clearanceTimeLabel,
      reasons: decision.reasons,
    })
  }

  return cards
}

export interface ParentClassOutlook {
  childId: string
  classId: string
  className: string
  meetsToday: boolean
  classTimeLabel: string | null
  /** End of today's lesson, such as "2:00 PM", when the schedule has one. */
  classEndLabel: string | null
  classStartsAt: string | null
  templateId: string | null
  status: ParentClearanceStatus | null
  clearanceTimeLabel: string | null
  reasons: string[]
  /** Next meeting after today, such as "Friday 4:00 PM". */
  nextLabel: string | null
  nextStartsAt: string | null
}

function nextMeetingAfterToday(
  classId: string,
  timeZone: string,
  rules: ScheduleRule[],
  exceptions: ScheduleException[],
  todayKey: string,
): { dateKey: string; startTime: string } | null {
  let dateKey = todayKey
  for (let step = 0; step < 21; step += 1) {
    dateKey = addCalendarDays(dateKey, 1, timeZone)
    const startTime = startTimeForDay(classId, dateKey, rules, exceptions)
    if (startTime) return { dateKey, startTime }
  }
  return null
}

/** Today's lesson, when the pool calendar has one, plus the next meeting for other days. */
export async function fetchParentClassOutlook(enrollments: ClearanceEnrollment[]): Promise<ParentClassOutlook[]> {
  const pairs = enrollments.filter((row) => row.childId && row.classId)
  const classIds = [...new Set(pairs.map((row) => row.classId))]
  const childIds = [...new Set(pairs.map((row) => row.childId))]
  if (classIds.length === 0) return []

  const supabase = getSupabaseClient()
  const { data: classRows, error: classError } = await supabase
    .from('classes')
    .select('id, name, timezone')
    .in('id', classIds)
  throwIfSupabaseError(classError)

  const classById = new Map<string, { name: string; timeZone: string }>()
  for (const row of classRows ?? []) {
    const record = row as Record<string, unknown>
    if (typeof record.id !== 'string') continue
    classById.set(record.id, {
      name: typeof record.name === 'string' ? record.name : 'Class',
      timeZone: typeof record.timezone === 'string' && record.timezone ? record.timezone : POOL_TIMEZONE_API_FALLBACK,
    })
  }

  const [templatesByClass, schedule] = await Promise.all([
    loadBudsTemplateIds(classIds),
    loadSchedule(classIds),
  ])
  const templateIds = [...new Set([...templatesByClass.values()].flat())]
  const submissions = await loadSubmissions(classIds, childIds, templateIds)
  const now = new Date()
  const outlook: ParentClassOutlook[] = []

  for (const pair of pairs) {
    const swimClass = classById.get(pair.classId)
    if (!swimClass) continue
    const sessionDate = formatCalendarDateKey(now, swimClass.timeZone)
    const slot = slotForDay(pair.classId, sessionDate, schedule.rules, schedule.exceptions)
    const templateId = templatesByClass.get(pair.classId)?.[0] ?? null
    if (slot) {
      const { startTime, endTime } = slot
      const classStart = zonedWallTimeToUtc(sessionDate, startTime, swimClass.timeZone)
      const decision = templateId
        ? decideStatus(
            submissionForDay(submissions, pair.childId, pair.classId, sessionDate, swimClass.timeZone),
            classStart,
            swimClass.timeZone,
          )
        : null
      outlook.push({
        childId: pair.childId,
        classId: pair.classId,
        className: swimClass.name,
        meetsToday: true,
        classTimeLabel: formatTime12h(startTime),
        classEndLabel: endTime ? formatTime12h(endTime) : null,
        classStartsAt: classStart.toISOString(),
        templateId,
        status: decision?.status ?? null,
        clearanceTimeLabel: decision?.clearanceTimeLabel ?? null,
        reasons: decision?.reasons ?? [],
        nextLabel: null,
        nextStartsAt: null,
      })
      continue
    }

    const upcoming = nextMeetingAfterToday(
      pair.classId,
      swimClass.timeZone,
      schedule.rules,
      schedule.exceptions,
      sessionDate,
    )
    outlook.push({
      childId: pair.childId,
      classId: pair.classId,
      className: swimClass.name,
      meetsToday: false,
      classTimeLabel: null,
      classEndLabel: null,
      classStartsAt: null,
      templateId,
      status: null,
      clearanceTimeLabel: null,
      reasons: [],
      nextLabel: upcoming
        ? `${calendarWeekdayLong(upcoming.dateKey, swimClass.timeZone)} ${formatTime12h(upcoming.startTime)}`
        : null,
      nextStartsAt: upcoming
        ? zonedWallTimeToUtc(upcoming.dateKey, upcoming.startTime, swimClass.timeZone).toISOString()
        : null,
    })
  }

  return outlook
}

async function loadOverrides(classId: string, sessionDate: string): Promise<Set<string>> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('buds_deck_overrides')
    .select('child_id, deck_override_by')
    .eq('class_id', classId)
    .eq('session_date', sessionDate)

  if (error) {
    if (missingSchema(error, 'buds_deck_overrides')) return new Set()
    schemaHint(error)
  }

  const overridden = new Set<string>()
  for (const row of data ?? []) {
    const record = row as Record<string, unknown>
    if (typeof record.child_id === 'string' && typeof record.deck_override_by === 'string') {
      overridden.add(record.child_id)
    }
  }
  return overridden
}

/** Color-coded fitness for every enrolled swimmer on a deck date. */
export async function fetchDeckFitness(input: {
  classId: string
  childIds: string[]
  dateKey: string
  timeZone: string
  startTime: string | null
}): Promise<Map<string, DeckFitness>> {
  const result = new Map<string, DeckFitness>()
  const childIds = [...new Set(input.childIds.filter(Boolean))]
  if (childIds.length === 0) return result

  const templatesByClass = await loadBudsTemplateIds([input.classId])
  const templateIds = templatesByClass.get(input.classId) ?? []
  if (templateIds.length === 0) return result

  let startTime = input.startTime
  if (!startTime) {
    const schedule = await loadSchedule([input.classId])
    startTime = startTimeForDay(input.classId, input.dateKey, schedule.rules, schedule.exceptions)
  }
  if (!startTime) return result

  const classStart = zonedWallTimeToUtc(input.dateKey, startTime, input.timeZone)
  const [submissions, overrides] = await Promise.all([
    loadSubmissions([input.classId], childIds, templateIds),
    loadOverrides(input.classId, input.dateKey),
  ])

  for (const childId of childIds) {
    const submission = submissionForDay(submissions, childId, input.classId, input.dateKey, input.timeZone)
    const decision = decideStatus(submission, classStart, input.timeZone)
    const overridable = decision.status === 'MISSING' || decision.status === 'HOLD_DIET'
    const overridden = overridable && overrides.has(childId)
    result.set(childId, {
      childId,
      status: overridden ? 'DECK_CLEARED' : decision.status,
      canOverride: overridable && !overridden,
      detail: overridden ? 'Verbal deck clearance' : (decision.reasons[0] ?? null),
    })
  }

  return result
}

/** Logs a one-tap verbal clearance. Illness flags cannot be overridden. */
export async function recordDeckVerbalClearance(input: {
  classId: string
  childId: string
  sessionDate: string
  reason: string
}): Promise<void> {
  const supabase = getSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  throwIfSupabaseError(authError)
  if (!user) throw new Error('You must be signed in.')

  const { error } = await supabase.from('buds_deck_overrides').insert({
    class_id: input.classId,
    child_id: input.childId,
    session_date: input.sessionDate,
    deck_override_by: user.id,
    deck_override_reason: input.reason.trim() || null,
  })

  if (error && (error as { code?: string }).code === '23505') return
  if (error) schemaHint(error)
}
