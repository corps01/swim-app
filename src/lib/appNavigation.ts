export const PARENT_HOME_PATH = '/'
export const PARENT_SWIMMERS_PATH = '/swimmers'
export const PARENT_CLASSES_PATH = '/classes'
export const SETTINGS_PATH = '/settings'
export const PARENT_ACCOUNT_PATH = '/account'
export const PARENT_ENROLL_PATH = '/enroll'

export const INSTRUCTOR_HOME_PATH = '/instructor'
export const INSTRUCTOR_CLASSES_PATH = '/instructor/classes'
export const INSTRUCTOR_SWIMMERS_PATH = '/instructor/swimmers'
export const INSTRUCTOR_SWIMMERS_CLASS_ID_PARAM = 'classId'

/** Old URL; redirect to swimmers in App routing. */
export const LEGACY_INSTRUCTOR_ROSTER_PATH = '/instructor/roster'

export function instructorSwimmersPath(classId?: string): string {
  if (!classId?.trim()) return INSTRUCTOR_SWIMMERS_PATH
  const params = new URLSearchParams({ [INSTRUCTOR_SWIMMERS_CLASS_ID_PARAM]: classId.trim() })
  return `${INSTRUCTOR_SWIMMERS_PATH}?${params.toString()}`
}

export function parseInstructorSwimmersClassId(search: string): string | null {
  const value = new URLSearchParams(search).get(INSTRUCTOR_SWIMMERS_CLASS_ID_PARAM)?.trim()
  return value || null
}

export const INSTRUCTOR_ACCOUNT_PATH = '/instructor/account'
export const INSTRUCTOR_CREATE_CLASS_PATH = '/instructor/classes/new'
export const INSTRUCTOR_FORMS_PATH = '/instructor/forms'
export const INSTRUCTOR_FORM_NEW_PATH = '/instructor/forms/new'

export function instructorEditFormPath(templateId: string): string {
  return `/instructor/forms/${templateId}/edit`
}

export function instructorSubmissionPath(
  submissionId: string,
  origin?:
    | { from: 'deck'; classId: string }
    | { from: 'swimmers'; classId?: string | null }
    | { from: 'student'; childId: string }
    | { from: 'class'; classId: string; date?: string | null },
): string {
  const params = new URLSearchParams()
  if (origin?.from === 'deck') {
    params.set('from', 'deck')
    params.set('classId', origin.classId)
  } else if (origin?.from === 'swimmers') {
    params.set('from', 'swimmers')
    if (origin.classId?.trim()) params.set('classId', origin.classId.trim())
  } else if (origin?.from === 'student') {
    params.set('from', 'student')
    params.set('childId', origin.childId)
  } else if (origin?.from === 'class') {
    params.set('from', 'class')
    params.set('classId', origin.classId)
    if (origin.date?.trim()) params.set('date', origin.date.trim())
  }
  const query = params.toString()
  return `/instructor/forms/submissions/${submissionId}${query ? `?${query}` : ''}`
}

export function submissionBackPath(search: string): string {
  const params = new URLSearchParams(search)
  const from = params.get('from')
  const classId = params.get('classId')?.trim()
  const childId = params.get('childId')?.trim()
  const date = params.get('date')?.trim()
  if (from === 'deck' && classId) return instructorSessionPath(classId)
  if (from === 'class' && classId) return instructorClassDetailPath(classId, { date: date || undefined })
  if (from === 'student' && childId) return instructorSwimmerPath(childId, { tab: 'waivers' })
  if (from === 'swimmers' && classId) return instructorSwimmersPath(classId)
  return INSTRUCTOR_SWIMMERS_PATH
}

export type InstructorStudentTab = 'activity' | 'health' | 'waivers'

export function instructorSwimmerPath(
  childId: string,
  options?: { tab?: InstructorStudentTab; from?: string },
): string {
  const params = new URLSearchParams()
  if (options?.tab && options.tab !== 'activity') params.set('tab', options.tab)
  if (options?.from?.trim()) params.set('from', options.from.trim())
  const query = params.toString()
  return `/instructor/swimmers/${childId}${query ? `?${query}` : ''}`
}

export function matchInstructorSwimmerPath(pathname: string): string | null {
  return pathname.match(/^\/instructor\/swimmers\/([^/]+)\/?$/)?.[1] ?? null
}

export function parseInstructorStudentTab(search: string): InstructorStudentTab {
  const tab = new URLSearchParams(search).get('tab')
  if (tab === 'health' || tab === 'waivers') return tab
  return 'activity'
}

const LEGACY_CLASS_DETAIL_PATTERN = /^\/classes\/([^/]+)\/?$/
const INSTRUCTOR_CLASS_DETAIL_PATTERN = /^\/instructor\/classes\/([^/]+)\/?$/
const INSTRUCTOR_DECK_PATTERN = /^\/instructor\/deck\/([^/]+)\/?$/

/** Class management lives at `/instructor/classes/:classId`. Live deck is `/instructor/deck/:classId`. */
export function instructorClassDetailPath(
  classId: string,
  options?: { date?: string; from?: 'classes' | 'swimmers' },
): string {
  const params = new URLSearchParams()
  if (options?.date?.trim()) params.set('date', options.date.trim())
  if (options?.from) params.set('from', options.from)
  const query = params.toString()
  return `/instructor/classes/${classId}${query ? `?${query}` : ''}`
}

export function matchLegacyClassDetailPath(pathname: string): string | null {
  return pathname.match(LEGACY_CLASS_DETAIL_PATTERN)?.[1] ?? null
}

export function classDetailOrigin(search: string): 'classes' | 'swimmers' | 'today' {
  const from = new URLSearchParams(search).get('from')
  if (from === 'classes' || from === 'swimmers') return from
  return 'today'
}

export function classDetailCameFromClasses(search: string): boolean {
  return classDetailOrigin(search) === 'classes'
}

export function classDetailBackPath(search: string): string {
  const origin = classDetailOrigin(search)
  const date = new URLSearchParams(search).get('date')?.trim()
  if (origin === 'classes') return INSTRUCTOR_CLASSES_PATH
  if (origin === 'swimmers') return INSTRUCTOR_SWIMMERS_PATH
  return date ? `${INSTRUCTOR_HOME_PATH}?date=${date}` : INSTRUCTOR_HOME_PATH
}

export function matchInstructorClassDetailPath(pathname: string): string | null {
  if (pathname === INSTRUCTOR_CREATE_CLASS_PATH) return null
  if (/\/(?:edit|share)\/?$/.test(pathname)) return null
  return pathname.match(INSTRUCTOR_CLASS_DETAIL_PATTERN)?.[1] ?? null
}

export function matchInstructorDeckPath(pathname: string): string | null {
  return pathname.match(INSTRUCTOR_DECK_PATTERN)?.[1] ?? null
}

export function instructorEditClassPath(classId: string): string {
  return `/instructor/classes/${classId}/edit`
}

export function instructorShareClassPath(classId: string): string {
  return `/instructor/classes/${classId}/share`
}

export function instructorSessionPath(classId: string, agendaDate?: string): string {
  const base = `/instructor/deck/${classId}`
  if (!agendaDate?.trim()) return base
  const params = new URLSearchParams({ date: agendaDate.trim() })
  return `${base}?${params.toString()}`
}

export const INSTRUCTOR_PROGRESS_LOG_PATH = '/instructor/progress/log'

export function instructorProgressLogPath(options: {
  childId: string
  classId?: string | null
  date?: string | null
  from?: 'swimmers' | 'student'
}): string {
  const params = new URLSearchParams({ childId: options.childId.trim() })
  if (options.classId?.trim()) params.set('classId', options.classId.trim())
  if (options.date?.trim()) params.set('date', options.date.trim())
  if (options.from === 'swimmers' || options.from === 'student') params.set('from', options.from)
  return `${INSTRUCTOR_PROGRESS_LOG_PATH}?${params.toString()}`
}

export function parseInstructorProgressLogSearch(search: string): {
  childId: string | null
  classId: string | null
  date: string | null
  from: 'swimmers' | 'student' | 'deck'
} {
  const params = new URLSearchParams(search)
  const rawFrom = params.get('from')?.trim()
  const from = rawFrom === 'swimmers' || rawFrom === 'student' ? rawFrom : 'deck'
  return {
    childId: params.get('childId')?.trim() || null,
    classId: params.get('classId')?.trim() || null,
    date: params.get('date')?.trim() || null,
    from,
  }
}

/** Where the progress log should return: swimmers list or deck mode. */
export function instructorProgressLogReturnPath(search: string): string {
  const { childId, classId, date, from } = parseInstructorProgressLogSearch(search)
  if (from === 'student' && childId) return instructorSwimmerPath(childId, { tab: 'activity' })
  if (from === 'swimmers') {
    return classId ? instructorSwimmersPath(classId) : INSTRUCTOR_SWIMMERS_PATH
  }
  if (classId) return instructorSessionPath(classId, date ?? undefined)
  return INSTRUCTOR_SWIMMERS_PATH
}

export function isKnownInstructorPath(pathname: string): boolean {
  if (
    pathname === SETTINGS_PATH ||
    pathname === INSTRUCTOR_HOME_PATH ||
    pathname === INSTRUCTOR_CLASSES_PATH ||
    pathname === INSTRUCTOR_CREATE_CLASS_PATH ||
    pathname === INSTRUCTOR_SWIMMERS_PATH ||
    pathname === LEGACY_INSTRUCTOR_ROSTER_PATH ||
    pathname === INSTRUCTOR_ACCOUNT_PATH ||
    pathname === INSTRUCTOR_PROGRESS_LOG_PATH ||
    pathname === INSTRUCTOR_FORMS_PATH ||
    pathname === INSTRUCTOR_FORM_NEW_PATH
  ) {
    return true
  }
  return (
    INSTRUCTOR_DECK_PATTERN.test(pathname) ||
    /^\/instructor\/classes\/[^/]+\/edit\/?$/.test(pathname) ||
    /^\/instructor\/classes\/[^/]+\/share\/?$/.test(pathname) ||
    /^\/instructor\/classes\/[^/]+\/?$/.test(pathname) ||
    /^\/instructor\/forms\/[^/]+\/edit\/?$/.test(pathname) ||
    /^\/instructor\/forms\/submissions\/[^/]+\/?$/.test(pathname) ||
    /^\/instructor\/swimmers\/[^/]+\/?$/.test(pathname)
  )
}

export function isKnownParentPath(pathname: string): boolean {
  if (
    pathname === PARENT_HOME_PATH ||
    pathname === PARENT_SWIMMERS_PATH ||
    pathname === PARENT_CLASSES_PATH ||
    pathname === SETTINGS_PATH ||
    pathname === PARENT_ACCOUNT_PATH ||
    pathname === PARENT_ENROLL_PATH
  ) {
    return true
  }
  return (
    /^\/swimmers\/[^/]+\/edit\/?$/.test(pathname) ||
    /^\/swimmers\/[^/]+\/activity\/?$/.test(pathname) ||
    /^\/swimmers\/[^/]+\/?$/.test(pathname) ||
    /^\/swimmers\/[^/]+\/buds\/?$/.test(pathname) ||
    /^\/swimmers\/[^/]+\/questionnaire\/?$/.test(pathname) ||
    /^\/swimmers\/[^/]+\/classes\/[^/]+\/?$/.test(pathname) ||
    /^\/swimmers\/[^/]+\/waiver\/[^/]+\/?$/.test(pathname)
  )
}

export function parentEditSwimmerPath(childId: string): string {
  return `/swimmers/${childId}/edit`
}

export function parentSwimmerPath(childId: string, options?: { from?: string }): string {
  const params = new URLSearchParams()
  if (options?.from?.trim()) params.set('from', options.from.trim())
  const query = params.toString()
  return `/swimmers/${childId}${query ? `?${query}` : ''}`
}

export function parentSwimmerClassPath(childId: string, classId: string, options?: { from?: string }): string {
  const params = new URLSearchParams()
  if (options?.from?.trim()) params.set('from', options.from.trim())
  const query = params.toString()
  return `/swimmers/${childId}/classes/${classId}${query ? `?${query}` : ''}`
}

export function parentWaiverPath(childId: string, templateId: string, classId: string): string {
  const params = new URLSearchParams({ classId: classId.trim() })
  return `/swimmers/${childId}/waiver/${templateId.trim()}?${params.toString()}`
}

/** Old activity URL. The app replaces it with `parentSwimmerPath`. */
export function parentSwimmerActivityPath(childId: string): string {
  return `/swimmers/${childId}/activity`
}

export function parentQuestionnairePath(childId: string, classId: string, templateId: string): string {
  const params = new URLSearchParams({
    classId: classId.trim(),
    templateId: templateId.trim(),
  })
  return `/swimmers/${childId}/questionnaire?${params.toString()}`
}

/** Daily BUDS check-in. Enrollment questionnaires stay on `parentQuestionnairePath`. */
export function parentBudsPath(childId: string, classId: string, templateId: string): string {
  const params = new URLSearchParams({
    classId: classId.trim(),
    templateId: templateId.trim(),
  })
  return `/swimmers/${childId}/buds?${params.toString()}`
}

export function parseParentQuestionnaireSearch(search: string): {
  classId: string | null
  templateId: string | null
} {
  const params = new URLSearchParams(search)
  return {
    classId: params.get('classId')?.trim() || null,
    templateId: params.get('templateId')?.trim() || null,
  }
}

export const PARENT_FORM_SIGNED_PARAM = 'formSigned'

export function parentHomeSignedPath(): string {
  return `/?${PARENT_FORM_SIGNED_PARAM}=1`
}

export function parentEnrollPath(options?: { childId?: string; inviteCode?: string; from?: string }): string {
  const params = new URLSearchParams()
  if (options?.childId?.trim()) params.set('childId', options.childId.trim())
  if (options?.inviteCode?.trim()) params.set('invite', options.inviteCode.trim().toUpperCase())
  if (options?.from?.trim()) params.set('from', options.from.trim())
  const query = params.toString()
  return query ? `${PARENT_ENROLL_PATH}?${query}` : PARENT_ENROLL_PATH
}

export function parentBackTarget(search: string, fallback: string): string {
  const from = new URLSearchParams(search).get('from')?.trim() ?? ''
  const path = from.split('?')[0] ?? ''
  return path.startsWith('/') && isKnownParentPath(path) ? from : fallback
}

export function instructorBackTarget(search: string, fallback: string): string {
  const from = new URLSearchParams(search).get('from')?.trim() ?? ''
  const path = from.split('?')[0] ?? ''
  return path.startsWith('/') && isKnownInstructorPath(path) ? from : fallback
}

export type ParentRoute =
  | { kind: 'home' }
  | { kind: 'swimmers' }
  | { kind: 'classes' }
  | { kind: 'swimmerClass'; childId: string; classId: string }
  | { kind: 'waiver'; childId: string; templateId: string }
  | { kind: 'account' }
  | { kind: 'enroll' }
  | { kind: 'edit'; childId: string }
  | { kind: 'activity'; childId: string }
  | { kind: 'swimmer'; childId: string }
  | { kind: 'buds'; childId: string }
  | { kind: 'questionnaire'; childId: string }

export function parseParentRoute(pathname: string): ParentRoute {
  if (pathname === PARENT_ACCOUNT_PATH) return { kind: 'account' }
  if (pathname === PARENT_ENROLL_PATH) return { kind: 'enroll' }
  if (pathname === PARENT_SWIMMERS_PATH) return { kind: 'swimmers' }
  if (pathname === PARENT_CLASSES_PATH) return { kind: 'classes' }
  const swimmerClassMatch = pathname.match(/^\/swimmers\/([^/]+)\/classes\/([^/]+)\/?$/)
  if (swimmerClassMatch?.[1] && swimmerClassMatch[2]) {
    return { kind: 'swimmerClass', childId: swimmerClassMatch[1], classId: swimmerClassMatch[2] }
  }
  const waiverMatch = pathname.match(/^\/swimmers\/([^/]+)\/waiver\/([^/]+)\/?$/)
  if (waiverMatch?.[1] && waiverMatch[2]) {
    return { kind: 'waiver', childId: waiverMatch[1], templateId: waiverMatch[2] }
  }
  const editMatch = pathname.match(/^\/swimmers\/([^/]+)\/edit\/?$/)
  if (editMatch?.[1]) return { kind: 'edit', childId: editMatch[1] }
  const activityMatch = pathname.match(/^\/swimmers\/([^/]+)\/activity\/?$/)
  if (activityMatch?.[1]) return { kind: 'activity', childId: activityMatch[1] }
  const budsMatch = pathname.match(/^\/swimmers\/([^/]+)\/buds\/?$/)
  if (budsMatch?.[1]) return { kind: 'buds', childId: budsMatch[1] }
  const questionnaireMatch = pathname.match(/^\/swimmers\/([^/]+)\/questionnaire\/?$/)
  if (questionnaireMatch?.[1]) return { kind: 'questionnaire', childId: questionnaireMatch[1] }
  const swimmerMatch = pathname.match(/^\/swimmers\/([^/]+)\/?$/)
  if (swimmerMatch?.[1]) return { kind: 'swimmer', childId: swimmerMatch[1] }
  return { kind: 'home' }
}

export type InstructorTab = 'agenda' | 'classes' | 'swimmers' | 'account'

export function instructorPathForTab(tab: InstructorTab): string {
  switch (tab) {
    case 'agenda':
      return INSTRUCTOR_HOME_PATH
    case 'classes':
      return INSTRUCTOR_CLASSES_PATH
    case 'swimmers':
      return INSTRUCTOR_SWIMMERS_PATH
    case 'account':
      return INSTRUCTOR_ACCOUNT_PATH
  }
}
