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
    pathname === INSTRUCTOR_PROGRESS_LOG_PATH
  ) {
    return true
  }
  return (
    /^\/instructor\/classes\/[^/]+\/edit\/?$/.test(pathname) ||
    /^\/instructor\/classes\/[^/]+\/share\/?$/.test(pathname) ||
    /^\/instructor\/classes\/[^/]+\/?$/.test(pathname)
  )
}

export function isKnownParentPath(pathname: string): boolean {
  if (pathname === PARENT_HOME_PATH || pathname === PARENT_ACCOUNT_PATH || pathname === PARENT_ENROLL_PATH) {
    return true
  }
  return (
    /^\/swimmers\/[^/]+\/edit\/?$/.test(pathname) ||
    /^\/swimmers\/[^/]+\/activity\/?$/.test(pathname)
  )
}

export function parentEditSwimmerPath(childId: string): string {
  return `/swimmers/${childId}/edit`
}

export function parentSwimmerActivityPath(childId: string): string {
  return `/swimmers/${childId}/activity`
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

export function parseParentRoute(pathname: string): ParentRoute {
  if (pathname === PARENT_ACCOUNT_PATH) return { kind: 'account' }
  if (pathname === PARENT_ENROLL_PATH) return { kind: 'enroll' }
  const editMatch = pathname.match(/^\/swimmers\/([^/]+)\/edit\/?$/)
  if (editMatch?.[1]) return { kind: 'edit', childId: editMatch[1] }
  const activityMatch = pathname.match(/^\/swimmers\/([^/]+)\/activity\/?$/)
  if (activityMatch?.[1]) return { kind: 'activity', childId: activityMatch[1] }
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
