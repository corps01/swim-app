/** Parent enroll URL with `?invite=<instructor profile UUID>`. */
export function inviteLinkFor(instructorId: string): string {
  const url = new URL(window.location.href)
  url.search = ''
  url.searchParams.set('invite', instructorId)
  return url.toString()
}

/** Short label for deck signage; full invite remains the profile UUID. */
export function shortClassCodeLabel(instructorId: string): string {
  const compact = instructorId.replace(/-/g, '').slice(0, 4).toUpperCase()
  return `SWIM-${compact}`
}
