import { getStoredPendingInviteCode } from './pendingInvite'

export const CLASS_CODE_LENGTH = 6

const CODE_CHARS = /[A-Z0-9]/g

/** Strip spaces and non-alphanumeric; uppercase. */
export function normalizeClassCodeInput(raw: string): string {
  const matches = raw.toUpperCase().match(CODE_CHARS)
  return (matches ?? []).join('').slice(0, CLASS_CODE_LENGTH)
}

/** Display as spaced block characters, e.g. `ABC123` → `A B C 1 2 3`. */
export function formatClassCodeBlocks(code: string): string {
  const normalized = normalizeClassCodeInput(code)
  if (!normalized) return ''
  return normalized.split('').join(' ')
}

export const CLASS_CODE_NOT_FOUND_MESSAGE =
  'Class code not found. Check with your instructor.'

export const DUPLICATE_CLASS_ENROLLMENT_MESSAGE = 'Child is already enrolled in this class.'

/** Read normalized class code from `?invite=` or session (saved before login). */
export function readInviteCodeFromLocation(): string {
  const fromQuery = new URLSearchParams(window.location.search).get('invite')
  if (fromQuery) {
    return normalizeClassCodeInput(fromQuery)
  }
  return getStoredPendingInviteCode()
}

/** Remove stale or invalid `invite` query param without a full navigation. */
export function clearInviteQueryParam(): void {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('invite')) return
  url.searchParams.delete('invite')
  const next = `${url.pathname}${url.search}${url.hash}`
  window.history.replaceState({}, '', next)
}
