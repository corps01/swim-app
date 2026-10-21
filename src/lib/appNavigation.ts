export const PARENT_HOME_PATH = '/'
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
  origin?: { from: 'deck'; classId: string } | { from: 'swimmers' },
): string {
  const params = new URLSearchParams()
  if (origin?.from === 'deck') {
    params.set('from', 'deck')
    params.set('classId', origin.classId)
  } else if (origin?.from === 'swimmers') {
    params.set('from', 'swimmers')
  }
  const query = params.toString()
  return `/instructor/forms/submissions/${submissionId}${query ? `?${query}` : ''}`
}

export function submissionBackPath(search: string): string {
  const params = new URLSearchParams(search)
  const from = params.get('from')
  const classId = params.get('classId')?.trim()
  if (from === 'deck' && classId) return instructorSessionPath(classId)
  return INSTRUCTOR_SWIMMERS_PATH
}

export function instructorEditClassPath(classId: string): string {
  return `/instructor/classes/${classId}/edit`
}

export function instructorShareClassPath(classId: string): string {
  return `/instructor/classes/${classId}/share`
}

export function instructorSessionPath(classId: string, agendaDate?: string): string {
  const base = `/instructor/classes/${classId}`
  if (!agendaDate?.trim()) return base
  const params = new URLSearchParams({ date: agendaDate.trim() })
  return `${base}?${params.toString()}`
}

export const INSTRUCTOR_PROGRESS_LOG_PATH = '/instructor/progress/log'

export function instructorProgressLogPath(options: {
  childId: string
  classId?: string | null
  date?: string | null
  from?: 'swimmers'
}): string {
  const params = new URLSearchParams({ childId: options.childId.trim() })
  if (options.classId?.trim()) params.set('classId', options.classId.trim())
  if (options.date?.trim()) params.set('date', options.date.trim())
  if (options.from === 'swimmers') params.set('from', 'swimmers')
  return `${INSTRUCTOR_PROGRESS_LOG_PATH}?${params.toString()}`
}

export function parseInstructorProgressLogSearch(search: string): {
  childId: string | null
  classId: string | null
  date: string | null
  from: 'swimmers' | 'deck'
} {
  const params = new URLSearchParams(search)
  const from = params.get('from')?.trim() === 'swimmers' ? 'swimmers' : 'deck'
  return {
    childId: params.get('childId')?.trim() || null,
    classId: params.get('classId')?.trim() || null,
    date: params.get('date')?.trim() || null,
    from,
  }
}

/** Where the progress log should return: swimmers list or deck mode. */
export function instructorProgressLogReturnPath(search: string): string {
  const { classId, date, from } = parseInstructorProgressLogSearch(search)
  if (from === 'swimmers') {
    return classId ? instructorSwimmersPath(classId) : INSTRUCTOR_SWIMMERS_PATH
  }
  if (classId) return instructorSessionPath(classId, date ?? undefined)
  return INSTRUCTOR_SWIMMERS_PATH
}

export function isKnownInstructorPath(pathname: string): boolean {
  if (
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
    /^\/instructor\/classes\/[^/]+\/edit\/?$/.test(pathname) ||
    /^\/instructor\/classes\/[^/]+\/share\/?$/.test(pathname) ||
    /^\/instructor\/classes\/[^/]+\/?$/.test(pathname) ||
    /^\/instructor\/forms\/[^/]+\/edit\/?$/.test(pathname) ||
    /^\/instructor\/forms\/submissions\/[^/]+\/?$/.test(pathname)
  )
}

export function isKnownParentPath(pathname: string): boolean {
  if (pathname === PARENT_HOME_PATH || pathname === PARENT_ACCOUNT_PATH || pathname === PARENT_ENROLL_PATH) {
    return true
  }
  return (
    /^\/swimmers\/[^/]+\/edit\/?$/.test(pathname) ||
    /^\/swimmers\/[^/]+\/activity\/?$/.test(pathname) ||
    /^\/swimmers\/[^/]+\/questionnaire\/?$/.test(pathname)
  )
}

export function parentEditSwimmerPath(childId: string): string {
  return `/swimmers/${childId}/edit`
}

export function parentSwimmerActivityPath(childId: string): string {
  return `/swimmers/${childId}/activity`
}

export function parentQuestionnairePath(childId: string, classId: string, templateId: string): string {
  const params = new URLSearchParams({
    classId: classId.trim(),
    templateId: templateId.trim(),
    from: 'home',
  })
  return `/swimmers/${childId}/questionnaire?${params.toString()}`
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

export function parentEnrollPath(options?: { childId?: string; inviteCode?: string }): string {
  const params = new URLSearchParams()
  if (options?.childId?.trim()) params.set('childId', options.childId.trim())
  if (options?.inviteCode?.trim()) params.set('invite', options.inviteCode.trim().toUpperCase())
  const query = params.toString()
  return query ? `${PARENT_ENROLL_PATH}?${query}` : PARENT_ENROLL_PATH
}

export type ParentRoute =
  | { kind: 'home' }
  | { kind: 'account' }
  | { kind: 'enroll' }
  | { kind: 'edit'; childId: string }
  | { kind: 'activity'; childId: string }
  | { kind: 'questionnaire'; childId: string }

export function parseParentRoute(pathname: string): ParentRoute {
  if (pathname === PARENT_ACCOUNT_PATH) return { kind: 'account' }
  if (pathname === PARENT_ENROLL_PATH) return { kind: 'enroll' }
  const editMatch = pathname.match(/^\/swimmers\/([^/]+)\/edit\/?$/)
  if (editMatch?.[1]) return { kind: 'edit', childId: editMatch[1] }
  const activityMatch = pathname.match(/^\/swimmers\/([^/]+)\/activity\/?$/)
  if (activityMatch?.[1]) return { kind: 'activity', childId: activityMatch[1] }
  const questionnaireMatch = pathname.match(/^\/swimmers\/([^/]+)\/questionnaire\/?$/)
  if (questionnaireMatch?.[1]) return { kind: 'questionnaire', childId: questionnaireMatch[1] }
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
