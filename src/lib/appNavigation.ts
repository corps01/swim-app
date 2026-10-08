export const PARENT_HOME_PATH = '/'
export const PARENT_ACCOUNT_PATH = '/account'
export const PARENT_ENROLL_PATH = '/enroll'

export const INSTRUCTOR_HOME_PATH = '/instructor'
export const INSTRUCTOR_ROSTER_PATH = '/instructor/roster'
export const INSTRUCTOR_ACCOUNT_PATH = '/instructor/account'
export const INSTRUCTOR_CREATE_CLASS_PATH = '/instructor/classes/new'

export const LAST_CREATED_CLASS_STORAGE_KEY = 'splashpass:lastCreatedClassId'

export function parentEditSwimmerPath(childId: string): string {
  return `/swimmers/${childId}/edit`
}

export type ParentRoute =
  | { kind: 'home' }
  | { kind: 'account' }
  | { kind: 'enroll' }
  | { kind: 'edit'; childId: string }

export function parseParentRoute(pathname: string): ParentRoute {
  if (pathname === PARENT_ACCOUNT_PATH) return { kind: 'account' }
  if (pathname === PARENT_ENROLL_PATH) return { kind: 'enroll' }
  const editMatch = pathname.match(/^\/swimmers\/([^/]+)\/edit\/?$/)
  if (editMatch?.[1]) return { kind: 'edit', childId: editMatch[1] }
  return { kind: 'home' }
}

export type InstructorTab = 'classes' | 'roster' | 'account'

export function instructorPathForTab(tab: InstructorTab): string {
  switch (tab) {
    case 'classes':
      return INSTRUCTOR_HOME_PATH
    case 'roster':
      return INSTRUCTOR_ROSTER_PATH
    case 'account':
      return INSTRUCTOR_ACCOUNT_PATH
  }
}
