import { useEffect } from 'react'
import {
  INSTRUCTOR_HOME_PATH,
  PARENT_ENROLL_PATH,
  PARENT_HOME_PATH,
} from '../lib/appNavigation'
import { normalizeClassCodeInput } from '../lib/classCode'
import {
  getStoredPendingInviteCode,
  persistInviteFromCurrentUrl,
  setStoredPendingInviteCode,
} from '../lib/pendingInvite'
import type { AuthUser } from '../lib/auth'

/**
 * Each profile has exactly one `profiles.role` (`parent` | `instructor`). Redirects
 * assume a single active role per account — there is no dual-role switching in the app.
 */
export function getRoleCorrectionPath(
  authReady: boolean,
  user: AuthUser | null,
): string | null {
  if (!authReady || !user) return null

  const pathname = window.location.pathname
  const isInstructor = user.role === 'instructor'

  if (isInstructor && !pathname.startsWith('/instructor')) {
    return INSTRUCTOR_HOME_PATH
  }

  if (!isInstructor && pathname.startsWith('/instructor')) {
    return PARENT_HOME_PATH
  }

  return null
}

/** Read-only: whether parent should be sent to enroll with a pending invite code. */
function readPendingInviteEnrollPath(user: AuthUser | null): string | null {
  if (!user || user.role === 'instructor') return null

  const pathname = window.location.pathname
  const urlCode = normalizeClassCodeInput(
    new URLSearchParams(window.location.search).get('invite') ?? '',
  )
  const pending = urlCode || getStoredPendingInviteCode()
  if (!pending) return null

  const onEnrollPath = pathname === PARENT_ENROLL_PATH
  if (onEnrollPath && urlCode === pending) return null

  return `${PARENT_ENROLL_PATH}?invite=${encodeURIComponent(pending)}`
}

export function useRoleHomeRedirect(options: {
  /** False until the initial Supabase session + profile load has finished. */
  authReady: boolean
  user: AuthUser | null
  pathname: string
  navigate: (path: string) => void
}) {
  const { authReady, user, pathname, navigate } = options

  useEffect(() => {
    if (!authReady) return

    if (!user) {
      persistInviteFromCurrentUrl()
      return
    }

    const fromUrl = new URLSearchParams(window.location.search).get('invite')
    if (fromUrl && user.role !== 'instructor') {
      setStoredPendingInviteCode(fromUrl)
    }

    const roleTarget = getRoleCorrectionPath(true, user)
    if (roleTarget && roleTarget !== pathname) {
      navigate(roleTarget)
      return
    }

    const enrollTarget = readPendingInviteEnrollPath(user)
    const current = `${pathname}${window.location.search}`
    if (enrollTarget && enrollTarget !== current) {
      navigate(enrollTarget)
    }
  }, [authReady, user, pathname, navigate])
}

export function useAuthNavigationGate(authReady: boolean, user: AuthUser | null): {
  blocking: boolean
} {
  if (!authReady) {
    return { blocking: true }
  }

  const roleTarget = getRoleCorrectionPath(authReady, user)
  if (roleTarget && roleTarget !== window.location.pathname) {
    return { blocking: true }
  }

  if (user && user.role !== 'instructor') {
    const enrollTarget = readPendingInviteEnrollPath(user)
    const current = `${window.location.pathname}${window.location.search}`
    if (enrollTarget && enrollTarget !== current) {
      return { blocking: true }
    }
  }

  return { blocking: false }
}
