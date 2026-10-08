const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/** Calendar date as YYYY-MM-DD — no timezone conversion. */
export function normalizeDateOnlyString(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  const datePart = trimmed.slice(0, 10)
  const match = DATE_ONLY_PATTERN.exec(datePart)
  if (!match) return ''

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!isValidDateParts(year, month, day)) return ''

  return `${match[1]}-${match[2]}-${match[3]}`
}

export function parseDateOnlyParts(
  raw: string,
): { year: number; month: number; day: number } | null {
  const normalized = normalizeDateOnlyString(raw)
  if (!normalized) return null
  const match = DATE_ONLY_PATTERN.exec(normalized)
  if (!match) return null
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const lastDay = new Date(year, month, 0).getDate()
  return day <= lastDay
}

/** Display using calendar parts only (avoids UTC shift from ISO timestamps). */
export function formatDateOnlyForDisplay(raw: string): string {
  const parts = parseDateOnlyParts(raw)
  if (!parts) return raw.trim()
  const date = new Date(parts.year, parts.month - 1, parts.day)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function ageFromDateOnly(raw: string): number | null {
  const parts = parseDateOnlyParts(raw)
  if (!parts) return null

  const today = new Date()
  let age = today.getFullYear() - parts.year
  const monthDelta = today.getMonth() + 1 - parts.month
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < parts.day)) {
    age -= 1
  }
  return age
}
