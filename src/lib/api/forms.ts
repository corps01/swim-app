import { withFitnessIntakeQuestions } from '../budsFitness'
import { formatAppError, throwIfSupabaseError } from '../errors'
import { groupBudsAnswers, ISR_BUDS_CATEGORY } from '../formQuestions'
import { getSupabaseClient } from '../supabase'
import { formatCalendarDateKey } from '../timeZone/calendar'
import { POOL_TIMEZONE_API_FALLBACK } from '../timeZone/pool'
import type {
  AnswerSnapshot,
  ChildBudsEntry,
  ClassBudsDay,
  ClassForm,
  FormInputType,
  FormSubmissionReview,
  FormTemplateDetail,
  FormTemplateQuestion,
  FormTemplateSummary,
  ParentClassForm,
  ParentQuestionnaire,
  QuestionBankItem,
  SaveFormTemplateInput,
  SwimmerFormCompliance,
} from '../../types/questionnaire'

const INPUT_TYPES = new Set<FormInputType>(['text', 'textarea', 'yes_no', 'select'])

function asInputType(value: unknown): FormInputType | null {
  return typeof value === 'string' && INPUT_TYPES.has(value as FormInputType)
    ? (value as FormInputType)
    : null
}

function parseQuestion(row: Record<string, unknown>): QuestionBankItem | null {
  const inputType = asInputType(row.input_type)
  if (
    typeof row.id !== 'string' ||
    typeof row.category !== 'string' ||
    typeof row.question_text !== 'string' ||
    typeof row.created_at !== 'string' ||
    !inputType
  ) {
    return null
  }
  return {
    id: row.id,
    instructorId: typeof row.instructor_id === 'string' ? row.instructor_id : null,
    category: row.category,
    questionText: row.question_text,
    inputType,
    options: parseQuestionOptions(row.options),
    bankOrder: typeof row.bank_order === 'number' ? row.bank_order : null,
    requiredByDefault: row.required_by_default !== false,
    createdAt: row.created_at,
  }
}

export async function fetchQuestionBank(): Promise<QuestionBankItem[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('question_bank')
    .select('id, instructor_id, category, question_text, input_type, options, bank_order, required_by_default, created_at')
    .order('category', { ascending: true })
    .order('question_text', { ascending: true })

  throwIfSupabaseError(error)
  return (data ?? [])
    .map((row) => parseQuestion(row as Record<string, unknown>))
    .filter((row): row is QuestionBankItem => row !== null)
}

export function parseQuestionOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (typeof item === 'string' && item.trim()) return [item.trim()]
    if (item && typeof item === 'object' && 'label' in item) {
      const label = (item as { label?: unknown }).label
      if (typeof label === 'string' && label.trim()) return [label.trim()]
    }
    return []
  })
}

export async function createCustomQuestion(input: {
  instructorId: string
  category: string
  questionText: string
  inputType: FormInputType
  options?: string[]
}): Promise<QuestionBankItem> {
  const category = input.category.trim()
  const questionText = input.questionText.trim()
  const options = (input.options ?? []).map((option) => option.trim()).filter(Boolean)
  if (!category) throw new Error('Category is required.')
  if (!questionText) throw new Error('Question text is required.')
  if (input.inputType === 'select' && options.length === 0) {
    throw new Error('Add at least one dropdown option.')
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('question_bank')
    .insert({
      instructor_id: input.instructorId,
      category,
      question_text: questionText,
      input_type: input.inputType,
      options: input.inputType === 'select' ? options : null,
    })
    .select('id, instructor_id, category, question_text, input_type, options, bank_order, required_by_default, created_at')
    .single()

  throwIfSupabaseError(error)
  const parsed = data ? parseQuestion(data as Record<string, unknown>) : null
  if (!parsed) throw new Error('Could not save that question.')
  return parsed
}

export async function fetchFormTemplateSummaries(): Promise<FormTemplateSummary[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('form_templates')
    .select('id, title, description, is_active, created_at, form_template_questions(id), class_forms(id)')
    .order('created_at', { ascending: false })

  throwIfSupabaseError(error)
  return (data ?? []).flatMap((row) => {
    const record = row as Record<string, unknown>
    if (typeof record.id !== 'string' || typeof record.title !== 'string') return []
    const questions = Array.isArray(record.form_template_questions) ? record.form_template_questions : []
    const classes = Array.isArray(record.class_forms) ? record.class_forms : []
    return [
      {
        id: record.id,
        title: record.title,
        description: typeof record.description === 'string' ? record.description : null,
        isActive: record.is_active !== false,
        createdAt: typeof record.created_at === 'string' ? record.created_at : '',
        questionCount: questions.length,
        classCount: classes.length,
      },
    ]
  })
}

export async function fetchFormTemplate(templateId: string): Promise<FormTemplateDetail | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('form_templates')
    .select(
      'id, title, description, is_active, created_at, form_template_questions(question_id, sort_order, is_required), class_forms(class_id, is_mandatory_for_enrollment)',
    )
    .eq('id', templateId)
    .maybeSingle()

  throwIfSupabaseError(error)
  if (!data) return null

  const record = data as Record<string, unknown>
  if (typeof record.id !== 'string' || typeof record.title !== 'string') return null

  const questions = (Array.isArray(record.form_template_questions) ? record.form_template_questions : [])
    .flatMap((item) => {
      const row = item as Record<string, unknown>
      if (typeof row.question_id !== 'string') return []
      return [
        {
          questionId: row.question_id,
          sortOrder: typeof row.sort_order === 'number' ? row.sort_order : 0,
          isRequired: row.is_required !== false,
        },
      ]
    })
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const classLinks = (Array.isArray(record.class_forms) ? record.class_forms : []).flatMap((item) => {
    const row = item as Record<string, unknown>
    if (typeof row.class_id !== 'string') return []
    return [
      {
        classId: row.class_id,
        isMandatoryForEnrollment: row.is_mandatory_for_enrollment === true,
      },
    ]
  })

  return {
    id: record.id,
    title: record.title,
    description: typeof record.description === 'string' ? record.description : null,
    isActive: record.is_active !== false,
    createdAt: typeof record.created_at === 'string' ? record.created_at : '',
    questions,
    classLinks,
  }
}

export async function saveFormTemplate(input: SaveFormTemplateInput): Promise<string> {
  const title = input.title.trim()
  if (!title) throw new Error('Title is required.')

  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('save_form_template', {
    p_template_id: input.templateId,
    p_title: title,
    p_description: input.description.trim() || null,
    p_is_active: input.isActive,
    p_questions: input.questions.map((question) => ({
      question_id: question.questionId,
      is_required: question.isRequired,
    })),
    p_class_links: input.classLinks.map((link) => ({
      class_id: link.classId,
      is_mandatory_for_enrollment: link.isMandatoryForEnrollment,
    })),
  })

  if (error) throw new Error(formatAppError(error))
  if (typeof data !== 'string' || !data) {
    throw new Error('Could not save this questionnaire.')
  }
  return data
}

export const SIGNATURE_AGREEMENT = 'I agree & sign'

function parseClassForms(rows: unknown[]): Map<string, ClassForm[]> {
  const formsByClass = new Map<string, ClassForm[]>()
  for (const row of rows) {
    const record = row as Record<string, unknown>
    if (typeof record.class_id !== 'string' || typeof record.template_id !== 'string') continue
    const template = Array.isArray(record.form_templates) ? record.form_templates[0] : record.form_templates
    if (!template || typeof template !== 'object') continue
    const templateRow = template as Record<string, unknown>
    if (templateRow.is_active === false || typeof templateRow.title !== 'string') continue
    const list = formsByClass.get(record.class_id) ?? []
    list.push({
      classId: record.class_id,
      templateId: record.template_id,
      title: templateRow.title,
      isMandatoryForEnrollment: record.is_mandatory_for_enrollment === true,
    })
    formsByClass.set(record.class_id, list)
  }
  return formsByClass
}

export interface ChildFormHistoryItem {
  id: string
  title: string
  signedAt: string
  className: string | null
  /** True when the row is a daily BUDS check-in rather than a seasonal waiver. */
  daily: boolean
}

/** Signed waivers and daily check-ins for one child, newest first. */
export async function fetchChildFormHistory(childId: string): Promise<ChildFormHistoryItem[]> {
  const supabase = getSupabaseClient()
  const withSession = await supabase
    .from('form_submissions')
    .select('id, signed_at, session_date, form_templates(title), classes(name)')
    .eq('child_id', childId)
    .order('signed_at', { ascending: false })

  const rows = withSession.error
    ? await supabase
        .from('form_submissions')
        .select('id, signed_at, form_templates(title), classes(name)')
        .eq('child_id', childId)
        .order('signed_at', { ascending: false })
    : withSession
  throwIfSupabaseError(rows.error)

  return (rows.data ?? []).flatMap((row) => {
    const record = row as Record<string, unknown>
    if (typeof record.id !== 'string' || typeof record.signed_at !== 'string') return []
    const template = Array.isArray(record.form_templates) ? record.form_templates[0] : record.form_templates
    const swimClass = Array.isArray(record.classes) ? record.classes[0] : record.classes
    const title =
      template && typeof template === 'object' && typeof (template as { title?: unknown }).title === 'string'
        ? (template as { title: string }).title
        : 'Signed form'
    const className =
      swimClass && typeof swimClass === 'object' && typeof (swimClass as { name?: unknown }).name === 'string'
        ? (swimClass as { name: string }).name
        : null
    return [
      {
        id: record.id,
        title,
        signedAt: record.signed_at,
        className,
        daily: typeof record.session_date === 'string' && record.session_date.length > 0,
      },
    ]
  })
}

export async function fetchParentClassForms(
  pairs: Array<{ childId: string; classId: string }>,
): Promise<Map<string, ParentClassForm[]>> {
  const result = new Map<string, ParentClassForm[]>()
  const classIds = [...new Set(pairs.map((pair) => pair.classId.trim()).filter(Boolean))]
  const childIds = [...new Set(pairs.map((pair) => pair.childId.trim()).filter(Boolean))]
  if (classIds.length === 0 || childIds.length === 0) return result

  const supabase = getSupabaseClient()
  const [formsResult, submissionsResult] = await Promise.all([
    supabase
      .from('class_forms')
      .select('class_id, template_id, is_mandatory_for_enrollment, form_templates(title, is_active)')
      .in('class_id', classIds),
    supabase
      .from('form_submissions')
      .select('child_id, class_id, template_id')
      .in('child_id', childIds)
      .in('class_id', classIds),
  ])

  throwIfSupabaseError(formsResult.error)
  throwIfSupabaseError(submissionsResult.error)

  const formsByClass = parseClassForms(formsResult.data ?? [])
  const signedKeys = new Set<string>()
  for (const row of submissionsResult.data ?? []) {
    const record = row as Record<string, unknown>
    if (
      typeof record.child_id === 'string' &&
      typeof record.class_id === 'string' &&
      typeof record.template_id === 'string'
    ) {
      signedKeys.add(`${record.child_id}:${record.class_id}:${record.template_id}`)
    }
  }

  for (const pair of pairs) {
    const forms = formsByClass.get(pair.classId) ?? []
    if (forms.length === 0) continue
    result.set(
      formComplianceKey(pair.childId, pair.classId),
      forms.map((form) => ({
        ...form,
        signed: signedKeys.has(`${pair.childId}:${pair.classId}:${form.templateId}`),
      })),
    )
  }

  return result
}

export async function fetchParentQuestionnaire(input: {
  childId: string
  classId: string
  templateId: string
}): Promise<ParentQuestionnaire | null> {
  const supabase = getSupabaseClient()
  const { data: link, error: linkError } = await supabase
    .from('class_forms')
    .select('class_id, template_id, form_templates(id, title, description, is_active)')
    .eq('class_id', input.classId)
    .eq('template_id', input.templateId)
    .maybeSingle()

  throwIfSupabaseError(linkError)
  if (!link) return null

  const linkRow = link as Record<string, unknown>
  const templateValue = Array.isArray(linkRow.form_templates)
    ? linkRow.form_templates[0]
    : linkRow.form_templates
  if (!templateValue || typeof templateValue !== 'object') return null
  const template = templateValue as Record<string, unknown>
  if (typeof template.id !== 'string' || typeof template.title !== 'string') return null
  if (template.is_active === false) return null

  const { data: questionRows, error: questionError } = await supabase
    .from('form_template_questions')
    .select('question_id, sort_order, is_required, question_bank(question_text, input_type, options)')
    .eq('template_id', input.templateId)
    .order('sort_order', { ascending: true })

  throwIfSupabaseError(questionError)

  const questions: FormTemplateQuestion[] = (questionRows ?? []).flatMap((row) => {
    const record = row as Record<string, unknown>
    if (typeof record.question_id !== 'string') return []
    const bankValue = Array.isArray(record.question_bank) ? record.question_bank[0] : record.question_bank
    if (!bankValue || typeof bankValue !== 'object') return []
    const bank = bankValue as Record<string, unknown>
    const inputType = asInputType(bank.input_type)
    if (typeof bank.question_text !== 'string' || !inputType) return []
    return [
      {
        questionId: record.question_id,
        questionText: bank.question_text,
        inputType,
        options: parseQuestionOptions(bank.options),
        isRequired: record.is_required !== false,
        sortOrder: typeof record.sort_order === 'number' ? record.sort_order : 0,
      },
    ]
  })

  const questionIds = questions.map((question) => question.questionId)
  const { data: bankRows, error: bankError } = questionIds.length
    ? await supabase.from('question_bank').select('id, category').in('id', questionIds)
    : { data: [], error: null }
  throwIfSupabaseError(bankError)
  const isDailyBuds = (bankRows ?? []).some((row) => {
    const record = row as Record<string, unknown>
    return record.category === ISR_BUDS_CATEGORY
  })

  const { data: classRow, error: classError } = await supabase
    .from('classes')
    .select('timezone')
    .eq('id', input.classId)
    .maybeSingle()
  throwIfSupabaseError(classError)
  const timeZone =
    classRow && typeof (classRow as { timezone?: unknown }).timezone === 'string'
      ? (classRow as { timezone: string }).timezone
      : POOL_TIMEZONE_API_FALLBACK
  const sessionDate = isDailyBuds ? formatCalendarDateKey(new Date(), timeZone) : null

  const existingQuery = supabase
    .from('form_submissions')
    .select('id')
    .eq('child_id', input.childId)
    .eq('class_id', input.classId)
    .eq('template_id', input.templateId)
  const { data: existing, error: existingError } = sessionDate
    ? await existingQuery.eq('session_date', sessionDate).maybeSingle()
    : await existingQuery.maybeSingle()

  if (
    existingError &&
    sessionDate &&
    String((existingError as { message?: string }).message ?? '').toLowerCase().includes('session_date')
  ) {
    throw new Error(
      `${formatAppError(existingError).trim().replace(/\.+$/, '')}. Run docs/sql/10-buds-fitness.sql in the Supabase SQL editor.`,
    )
  }
  throwIfSupabaseError(existingError)

  return {
    templateId: template.id,
    classId: input.classId,
    title: template.title,
    description: typeof template.description === 'string' ? template.description : null,
    questions: isDailyBuds ? withFitnessIntakeQuestions(questions) : questions,
    alreadySigned: Boolean(existing),
    isDailyBuds,
    sessionDate,
    timeZone,
  }
}

export async function submitFormSignature(input: {
  childId: string
  classId: string
  templateId: string
  signedBy: string
  answers: AnswerSnapshot[]
  legalTextSnapshot: string
  signatureDataUrl: string
  /** Pool-local day for a daily BUDS check-in. Omit for one-time enrollment forms. */
  sessionDate?: string | null
}): Promise<void> {
  const supabase = getSupabaseClient()
  const sessionDate = input.sessionDate?.trim() || null

  if (sessionDate) {
    const { data: existing, error: existingError } = await supabase
      .from('form_submissions')
      .select('id')
      .eq('child_id', input.childId)
      .eq('class_id', input.classId)
      .eq('template_id', input.templateId)
      .eq('session_date', sessionDate)
      .maybeSingle()
    throwIfSupabaseError(existingError)

    if (existing && typeof (existing as { id?: unknown }).id === 'string') {
      const { error } = await supabase
        .from('form_submissions')
        .update({
          signed_by: input.signedBy,
          answers_json: input.answers,
          legal_text_snapshot: input.legalTextSnapshot,
          signature_data_url: input.signatureDataUrl,
          signed_at: new Date().toISOString(),
        })
        .eq('id', (existing as { id: string }).id)
      throwIfSupabaseError(error)
      return
    }
  }

  const { error } = await supabase.from('form_submissions').insert({
    child_id: input.childId,
    class_id: input.classId,
    template_id: input.templateId,
    signed_by: input.signedBy,
    answers_json: input.answers,
    legal_text_snapshot: input.legalTextSnapshot,
    signature_data_url: input.signatureDataUrl,
    ...(sessionDate ? { session_date: sessionDate } : {}),
  })

  if (error && (error as { code?: string }).code === '23505') {
    throw new Error('This questionnaire is already signed.')
  }
  throwIfSupabaseError(error)
}

export function formComplianceKey(childId: string, classId: string): string {
  return `${childId}:${classId}`
}

function firstEmbed(value: unknown): Record<string, unknown> | null {
  const row = Array.isArray(value) ? value[0] : value
  if (!row || typeof row !== 'object') return null
  return row as Record<string, unknown>
}

export async function fetchSwimmerFormCompliance(
  rows: Array<{ childId: string; classId: string }>,
): Promise<Map<string, SwimmerFormCompliance>> {
  const pairs = rows.filter((row) => row.childId.trim() && row.classId.trim())
  const result = new Map<string, SwimmerFormCompliance>()
  if (pairs.length === 0) return result

  const classIds = [...new Set(pairs.map((row) => row.classId))]
  const childIds = [...new Set(pairs.map((row) => row.childId))]
  const supabase = getSupabaseClient()

  const [linksResult, submissionsResult] = await Promise.all([
    supabase
      .from('class_forms')
      .select('class_id, template_id, form_templates(is_active)')
      .in('class_id', classIds),
    supabase
      .from('form_submissions')
      .select('id, child_id, class_id, template_id, signed_at')
      .in('class_id', classIds)
      .in('child_id', childIds),
  ])

  throwIfSupabaseError(linksResult.error)
  throwIfSupabaseError(submissionsResult.error)

  const templatesByClass = new Map<string, string[]>()
  for (const row of linksResult.data ?? []) {
    const record = row as Record<string, unknown>
    if (typeof record.class_id !== 'string' || typeof record.template_id !== 'string') continue
    const template = firstEmbed(record.form_templates)
    if (template?.is_active === false) continue
    const list = templatesByClass.get(record.class_id) ?? []
    list.push(record.template_id)
    templatesByClass.set(record.class_id, list)
  }

  const submissionsByPair = new Map<string, Array<{ id: string; templateId: string; signedAt: string }>>()
  for (const row of submissionsResult.data ?? []) {
    const record = row as Record<string, unknown>
    if (
      typeof record.id !== 'string' ||
      typeof record.child_id !== 'string' ||
      typeof record.class_id !== 'string' ||
      typeof record.template_id !== 'string'
    ) {
      continue
    }
    const key = formComplianceKey(record.child_id, record.class_id)
    const list = submissionsByPair.get(key) ?? []
    list.push({
      id: record.id,
      templateId: record.template_id,
      signedAt: typeof record.signed_at === 'string' ? record.signed_at : '',
    })
    submissionsByPair.set(key, list)
  }

  for (const pair of pairs) {
    const templates = templatesByClass.get(pair.classId) ?? []
    if (templates.length === 0) continue
    const key = formComplianceKey(pair.childId, pair.classId)
    const signed = submissionsByPair.get(key) ?? []
    const signedTemplateIds = new Set(signed.map((row) => row.templateId))
    const complete = templates.every((templateId) => signedTemplateIds.has(templateId))
    const latest = [...signed].sort((a, b) => b.signedAt.localeCompare(a.signedAt))[0]
    result.set(key, {
      childId: pair.childId,
      classId: pair.classId,
      status: complete ? 'signed' : 'pending',
      submissionId: complete ? (latest?.id ?? null) : null,
    })
  }

  return result
}

/** Most recent daily BUDS answers before this pool-local day. Meal time is left for the caller to drop. */
export async function fetchPreviousDailyAnswers(input: {
  childId: string
  classId: string
  templateId: string
  sessionDate: string
}): Promise<AnswerSnapshot[] | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('form_submissions')
    .select('answers_json, session_date')
    .eq('child_id', input.childId)
    .eq('class_id', input.classId)
    .eq('template_id', input.templateId)
    .lt('session_date', input.sessionDate)
    .order('session_date', { ascending: false })
    .limit(1)

  if (error) {
    const message = String((error as { message?: string }).message ?? '').toLowerCase()
    if (message.includes('session_date')) return null
    throwIfSupabaseError(error)
  }
  const row = data?.[0] as { answers_json?: unknown } | undefined
  if (!row) return null
  const answers = parseFrozenAnswers(row.answers_json)
  return answers.length > 0 ? answers : null
}

function parseFrozenAnswers(value: unknown): AnswerSnapshot[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const row = item as Record<string, unknown>
    const inputType = asInputType(row.input_type)
    if (typeof row.question_text !== 'string' || !inputType) return []
    return [
      {
        question_text: row.question_text,
        input_type: inputType,
        answer: typeof row.answer === 'string' ? row.answer : '',
      },
    ]
  })
}

/**
 * BUDS check-ins signed on one calendar day (in the class timezone) for a class.
 * A template counts as BUDS when it includes any ISR Daily BUDS bank question.
 */
export async function fetchClassBudsDay(input: {
  classId: string
  childIds: string[]
  dateKey: string
  timeZone: string
}): Promise<ClassBudsDay> {
  const supabase = getSupabaseClient()
  const [bankResult, linksResult] = await Promise.all([
    supabase.from('question_bank').select('id, question_text, bank_order').eq('category', ISR_BUDS_CATEGORY),
    supabase
      .from('class_forms')
      .select('template_id, form_templates(is_active, form_template_questions(question_id))')
      .eq('class_id', input.classId),
  ])

  throwIfSupabaseError(bankResult.error)
  throwIfSupabaseError(linksResult.error)

  const budsQuestionIds = new Set<string>()
  const bankOrderByText = new Map<string, number>()
  for (const row of bankResult.data ?? []) {
    const record = row as Record<string, unknown>
    if (typeof record.id === 'string') budsQuestionIds.add(record.id)
    if (typeof record.question_text === 'string' && typeof record.bank_order === 'number') {
      bankOrderByText.set(record.question_text, record.bank_order)
    }
  }

  const templateIds = (linksResult.data ?? []).flatMap((row) => {
    const record = row as Record<string, unknown>
    const template = firstEmbed(record.form_templates)
    if (typeof record.template_id !== 'string' || !template || template.is_active === false) return []
    const links = Array.isArray(template.form_template_questions) ? template.form_template_questions : []
    const usesBuds = links.some((link) => {
      const questionId = (link as Record<string, unknown>).question_id
      return typeof questionId === 'string' && budsQuestionIds.has(questionId)
    })
    return usesBuds ? [record.template_id] : []
  })

  const entriesByChild = new Map<string, ChildBudsEntry>()
  const dailyByChild = new Map<string, boolean>()
  const childIds = [...new Set(input.childIds.filter(Boolean))]
  if (templateIds.length === 0 || childIds.length === 0) return { templateIds, entriesByChild }

  const withSessionDate = await supabase
    .from('form_submissions')
    .select('id, child_id, template_id, signed_at, answers_json, session_date')
    .eq('class_id', input.classId)
    .in('template_id', templateIds)
    .in('child_id', childIds)

  const loaded =
    withSessionDate.error &&
    String((withSessionDate.error as { message?: string }).message ?? '').toLowerCase().includes('session_date')
      ? await supabase
          .from('form_submissions')
          .select('id, child_id, template_id, signed_at, answers_json')
          .eq('class_id', input.classId)
          .in('template_id', templateIds)
          .in('child_id', childIds)
      : withSessionDate

  const { data, error } = loaded
  throwIfSupabaseError(error)

  for (const row of data ?? []) {
    const record = row as Record<string, unknown>
    if (typeof record.id !== 'string' || typeof record.child_id !== 'string' || typeof record.signed_at !== 'string') {
      continue
    }
    const signed = new Date(record.signed_at)
    if (Number.isNaN(signed.getTime())) continue
    const sessionDate = typeof record.session_date === 'string' ? record.session_date.slice(0, 10) : null
    const onDay = sessionDate
      ? sessionDate === input.dateKey
      : formatCalendarDateKey(signed, input.timeZone) === input.dateKey
    if (!onDay) continue
    const existing = entriesByChild.get(record.child_id)
    const candidateIsDaily = Boolean(sessionDate)
    const existingIsDaily = dailyByChild.get(record.child_id) === true
    if (existing) {
      if (existingIsDaily && !candidateIsDaily) continue
      if (existingIsDaily === candidateIsDaily && existing.signedAt >= record.signed_at) continue
    }
    dailyByChild.set(record.child_id, candidateIsDaily)
    entriesByChild.set(record.child_id, {
      childId: record.child_id,
      submissionId: record.id,
      signedAt: record.signed_at,
      groups: groupBudsAnswers(parseFrozenAnswers(record.answers_json), bankOrderByText),
    })
  }

  return { templateIds, entriesByChild }
}

export async function fetchFormSubmissionReview(submissionId: string): Promise<FormSubmissionReview | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('form_submissions')
    .select(
      'id, child_id, class_id, template_id, signed_by, signed_at, answers_json, legal_text_snapshot, signature_data_url',
    )
    .eq('id', submissionId)
    .maybeSingle()

  throwIfSupabaseError(error)
  if (!data) return null

  const record = data as Record<string, unknown>
  if (typeof record.id !== 'string' || typeof record.class_id !== 'string' || typeof record.signed_at !== 'string') {
    return null
  }

  const childId = typeof record.child_id === 'string' ? record.child_id : ''
  const signedBy = typeof record.signed_by === 'string' ? record.signed_by : ''
  const templateId = typeof record.template_id === 'string' ? record.template_id : ''

  const classId = record.class_id
  const [childResult, parentResult, templateResult, classResult] = await Promise.all([
    childId
      ? supabase.from('children').select('first_name, last_name, date_of_birth').eq('id', childId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    signedBy
      ? supabase.from('profiles').select('full_name').eq('id', signedBy).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    templateId
      ? supabase.from('form_templates').select('title').eq('id', templateId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from('classes').select('name').eq('id', classId).maybeSingle(),
  ])

  throwIfSupabaseError(childResult.error)
  throwIfSupabaseError(parentResult.error)
  throwIfSupabaseError(templateResult.error)
  throwIfSupabaseError(classResult.error)

  const child = childResult.data as { first_name?: string; last_name?: string; date_of_birth?: string | null } | null
  const swimmerName = [child?.first_name, child?.last_name].filter(Boolean).join(' ') || 'Swimmer'
  const parent = parentResult.data as { full_name?: string } | null
  const template = templateResult.data as { title?: string } | null
  const classRow = classResult.data as { name?: string } | null

  return {
    id: record.id,
    childId,
    classId,
    templateId,
    signedBy,
    swimmerName,
    swimmerDateOfBirth: typeof child?.date_of_birth === 'string' ? child.date_of_birth : null,
    parentName: parent?.full_name?.trim() || 'Parent',
    templateTitle: template?.title?.trim() || 'Questionnaire',
    className: classRow?.name?.trim() || null,
    signedAt: record.signed_at,
    legalTextSnapshot: typeof record.legal_text_snapshot === 'string' ? record.legal_text_snapshot : null,
    signatureDataUrl: typeof record.signature_data_url === 'string' ? record.signature_data_url : null,
    answers: parseFrozenAnswers(record.answers_json),
  }
}
