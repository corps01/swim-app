import { fetchDeckFitness, type DeckFitness } from './budsClearance'
import { fetchParentClassForms } from './forms'
import { fetchProgressLogsForChild, type ProgressLog } from './progressLogs'
import { fitnessAnswersFromSnapshots } from '../budsFitness'
import { formatTime12h } from '../classSchedule'
import { ISR_BUDS_CATEGORY } from '../formQuestions'
import { throwIfSupabaseError } from '../errors'
import { getSupabaseClient } from '../supabase'
import { formatCalendarDateKey } from '../timeZone/calendar'
import type { AnswerSnapshot, FormInputType } from '../../types/questionnaire'

export interface InstructorStudentClass {
  classId: string
  name: string
  coachName: string
  schedule: string | null
  location: string | null
  timeZone: string
}

export interface InstructorStudentProfile {
  childId: string
  firstName: string
  lastName: string
  dateOfBirth: string | null
  notes: string
  parentName: string
  parentPhone: string | null
  classes: InstructorStudentClass[]
}

export interface InstructorHealthDay {
  date: string
  sleepHours: number | null
  mealLabel: string | null
  illness: string | null
  signedAt: string | null
  overrideName: string | null
  overrideReason: string | null
}

export interface InstructorWaiverItem {
  key: string
  title: string
  className: string | null
  signed: boolean
  signedAt: string | null
  submissionId: string | null
}

export interface InstructorStudentRecord {
  profile: InstructorStudentProfile | null
  logs: ProgressLog[]
  cheerCounts: Map<string, number>
  todayFitness: DeckFitness | null
  healthDays: InstructorHealthDay[]
  waivers: InstructorWaiverItem[]
}

function asAnswers(value: unknown): AnswerSnapshot[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const row = item as Record<string, unknown>
    const inputType = row.input_type
    if (typeof row.question_text !== 'string' || typeof row.answer !== 'string') return []
    if (inputType !== 'text' && inputType !== 'textarea' && inputType !== 'yes_no' && inputType !== 'select') return []
    return [{ question_text: row.question_text, input_type: inputType as FormInputType, answer: row.answer }]
  })
}

function illnessLabel(fever: boolean, vomiting: boolean, diarrhea: boolean): string | null {
  const flags = [
    fever ? 'Fever' : null,
    vomiting ? 'Vomiting' : null,
    diarrhea ? 'Diarrhea' : null,
  ].filter(Boolean)
  return flags.length > 0 ? flags.join(', ') : null
}

function worstFitness(rows: DeckFitness[]): DeckFitness | null {
  const rank: Record<DeckFitness['status'], number> = {
    NOT_FIT: 0,
    MISSING: 1,
    HOLD_DIET: 2,
    FLAGGED_CAUTION: 3,
    CLEARED: 4,
    DECK_CLEARED: 5,
  }
  return rows.reduce<DeckFitness | null>((best, row) => {
    if (!best || rank[row.status] < rank[best.status]) return row
    return best
  }, null)
}

export async function fetchInstructorStudent(childId: string): Promise<InstructorStudentRecord> {
  const supabase = getSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  throwIfSupabaseError(authError)
  if (!user) throw new Error('You must be signed in.')

  const { data: links, error: linksError } = await supabase
    .from('child_instructor_relationships')
    .select('class_id')
    .eq('instructor_id', user.id)
    .eq('child_id', childId)
    .eq('status', 'active')
  throwIfSupabaseError(linksError)

  const classIds = [...new Set((links ?? []).map((row) => row.class_id).filter((id): id is string => Boolean(id)))]

  const { data: child, error: childError } = await supabase
    .from('children')
    .select('id, first_name, last_name, date_of_birth, notes')
    .eq('id', childId)
    .maybeSingle()
  throwIfSupabaseError(childError)
  if (!child || !(links ?? []).length) {
    return { profile: null, logs: [], cheerCounts: new Map(), todayFitness: null, healthDays: [], waivers: [] }
  }

  const { data: parentLinks, error: parentError } = await supabase
    .from('parent_child_relationships')
    .select('parent_id')
    .eq('child_id', childId)
  throwIfSupabaseError(parentError)
  const parentId = parentLinks?.[0]?.parent_id ?? null

  let parentName = 'Parent'
  let parentPhone: string | null = null
  if (parentId) {
    const { data: parent, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', parentId)
      .maybeSingle()
    throwIfSupabaseError(profileError)
    if (parent?.full_name?.trim()) parentName = parent.full_name.trim()
    parentPhone = parent?.phone?.trim() || null
  }

  const classes: InstructorStudentClass[] = []
  if (classIds.length > 0) {
    const { data: classRows, error: classError } = await supabase
      .from('classes')
      .select('id, name, location, schedule_details, timezone, instructor_id')
      .in('id', classIds)
    throwIfSupabaseError(classError)
    const coachIds = [...new Set((classRows ?? []).map((row) => row.instructor_id).filter(Boolean))]
    const coachNames = new Map<string, string>()
    if (coachIds.length > 0) {
      const { data: coaches, error: coachError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', coachIds)
      throwIfSupabaseError(coachError)
      for (const coach of coaches ?? []) {
        if (coach.full_name?.trim()) coachNames.set(coach.id, coach.full_name.trim())
      }
    }
    for (const row of classRows ?? []) {
      classes.push({
        classId: row.id,
        name: row.name,
        coachName: coachNames.get(row.instructor_id) ?? 'Coach',
        schedule: row.schedule_details,
        location: row.location,
        timeZone: row.timezone || 'UTC',
      })
    }
  }

  const [logs, formsByKey, budsQuestionIds] = await Promise.all([
    fetchProgressLogsForChild(childId),
    classIds.length > 0
      ? fetchParentClassForms(classIds.map((classId) => ({ childId, classId })))
      : Promise.resolve(new Map()),
    supabase.from('question_bank').select('id').eq('category', ISR_BUDS_CATEGORY),
  ])
  throwIfSupabaseError(budsQuestionIds.error)

  const questionIds = (budsQuestionIds.data ?? []).map((row) => row.id)
  const budsTemplateIds = new Set<string>()
  if (questionIds.length > 0) {
    const { data: linksRows, error: templateError } = await supabase
      .from('form_template_questions')
      .select('template_id')
      .in('question_id', questionIds)
    throwIfSupabaseError(templateError)
    for (const row of linksRows ?? []) budsTemplateIds.add(row.template_id)
  }

  const submissions = await supabase
    .from('form_submissions')
    .select('id, class_id, template_id, signed_at, session_date, answers_json')
    .eq('child_id', childId)
    .order('signed_at', { ascending: false })
  throwIfSupabaseError(submissions.error)

  const classNameById = new Map(classes.map((row) => [row.classId, row.name]))
  const waivers: InstructorWaiverItem[] = []
  const seenWaiver = new Set<string>()
  for (const forms of formsByKey.values()) {
    for (const form of forms) {
      if (budsTemplateIds.has(form.templateId)) continue
      const key = `${form.classId}:${form.templateId}`
      if (seenWaiver.has(key)) continue
      seenWaiver.add(key)
      const signedRow = (submissions.data ?? []).find(
        (row) => row.class_id === form.classId && row.template_id === form.templateId && !row.session_date,
      )
      waivers.push({
        key,
        title: form.title,
        className: classNameById.get(form.classId) ?? null,
        signed: Boolean(signedRow) || form.signed,
        signedAt: signedRow?.signed_at ?? null,
        submissionId: signedRow?.id ?? null,
      })
    }
  }

  const overrides = await supabase
    .from('buds_deck_overrides')
    .select('session_date, deck_override_by, deck_override_reason, class_id')
    .eq('child_id', childId)
    .order('session_date', { ascending: false })
  const overrideRows = overrides.error ? [] : (overrides.data ?? [])
  const overrideNames = new Map<string, string>()
  const overrideIds = [...new Set(overrideRows.map((row) => row.deck_override_by))]
  if (overrideIds.length > 0) {
    const { data: people } = await supabase.from('profiles').select('id, full_name').in('id', overrideIds)
    for (const person of people ?? []) {
      if (person.full_name?.trim()) overrideNames.set(person.id, person.full_name.trim())
    }
  }

  const healthByDate = new Map<string, InstructorHealthDay>()
  for (const row of submissions.data ?? []) {
    if (!row.session_date) continue
    const answers = fitnessAnswersFromSnapshots(asAnswers(row.answers_json))
    const meal = answers.lastMealTime ? formatTime12h(answers.lastMealTime) : null
    const existing = healthByDate.get(row.session_date)
    const day: InstructorHealthDay = {
      date: row.session_date,
      sleepHours: answers.sleepHours,
      mealLabel: meal,
      illness: illnessLabel(answers.fever, answers.vomiting, answers.diarrhea),
      signedAt: row.signed_at,
      overrideName: existing?.overrideName ?? null,
      overrideReason: existing?.overrideReason ?? null,
    }
    healthByDate.set(row.session_date, day)
  }
  for (const row of overrideRows) {
    const current = healthByDate.get(row.session_date) ?? {
      date: row.session_date,
      sleepHours: null,
      mealLabel: null,
      illness: null,
      signedAt: null,
      overrideName: null,
      overrideReason: null,
    }
    current.overrideName = overrideNames.get(row.deck_override_by) ?? 'Coach'
    current.overrideReason = row.deck_override_reason
    healthByDate.set(row.session_date, current)
  }
  const healthDays = [...healthByDate.values()].sort((a, b) => b.date.localeCompare(a.date))

  const fitnessRows: DeckFitness[] = []
  await Promise.all(
    classes.map(async (swimClass) => {
      const dateKey = formatCalendarDateKey(new Date(), swimClass.timeZone)
      const map = await fetchDeckFitness({
        classId: swimClass.classId,
        childIds: [childId],
        dateKey,
        timeZone: swimClass.timeZone,
        startTime: null,
      })
      const fitness = map.get(childId)
      if (fitness) fitnessRows.push(fitness)
    }),
  )

  const cheerCounts = new Map<string, number>()
  if (logs.length > 0) {
    const { data: cheers, error: cheerError } = await supabase
      .from('progress_log_cheers')
      .select('progress_log_id')
      .in(
        'progress_log_id',
        logs.map((log) => log.id),
      )
    throwIfSupabaseError(cheerError)
    for (const cheer of cheers ?? []) {
      cheerCounts.set(cheer.progress_log_id, (cheerCounts.get(cheer.progress_log_id) ?? 0) + 1)
    }
  }

  return {
    profile: {
      childId,
      firstName: child.first_name,
      lastName: child.last_name,
      dateOfBirth: child.date_of_birth,
      notes: child.notes?.trim() ?? '',
      parentName,
      parentPhone,
      classes,
    },
    logs,
    cheerCounts,
    todayFitness: worstFitness(fitnessRows),
    healthDays,
    waivers,
  }
}
