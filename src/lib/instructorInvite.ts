/** Parent enroll URL with `?invite=<CLASS_CODE>`. */
export function inviteLinkForClass(classCode: string): string {
  const url = new URL(window.location.href)
  url.search = ''
  url.searchParams.set('invite', classCode.trim().toUpperCase())
  return url.toString()
}

/** Deck-friendly display for a 6-character class code. */
export function formatClassCodeDisplay(classCode: string): string {
  const normalized = classCode.trim().toUpperCase()
  if (normalized.length === 6) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3)}`
  }
  return normalized
}
