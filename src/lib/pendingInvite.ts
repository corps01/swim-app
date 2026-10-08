import { normalizeClassCodeInput } from './classCode'
import { PARENT_ENROLL_PATH } from './appNavigation'

const PENDING_INVITE_SESSION_KEY = 'splashpass:pendingInviteCode'

export function getStoredPendingInviteCode(): string {
  const raw = sessionStorage.getItem(PENDING_INVITE_SESSION_KEY)
  return raw ? normalizeClassCodeInput(raw) : ''
}

export function setStoredPendingInviteCode(code: string): void {
  const normalized = normalizeClassCodeInput(code)
  if (!normalized) {
    sessionStorage.removeItem(PENDING_INVITE_SESSION_KEY)
    return
  }
  sessionStorage.setItem(PENDING_INVITE_SESSION_KEY, normalized)
}

export function clearStoredPendingInviteCode(): void {
  sessionStorage.removeItem(PENDING_INVITE_SESSION_KEY)
}

/** Drop stored invite when lookup proves the code invalid (avoids redirect loops). */
export function clearPendingInviteIfMatches(code: string): void {
  const normalized = normalizeClassCodeInput(code)
  if (!normalized) return
  if (getStoredPendingInviteCode() === normalized) {
    clearStoredPendingInviteCode()
  }
}

/** Persist `?invite=` from the current URL for post-auth enrollment (any path). */
export function persistInviteFromCurrentUrl(): void {
  const fromQuery = new URLSearchParams(window.location.search).get('invite')
  if (fromQuery) {
    setStoredPendingInviteCode(fromQuery)
    return
  }

  if (window.location.pathname === PARENT_ENROLL_PATH) {
    const stored = getStoredPendingInviteCode()
    if (stored) return
  }
}
