/**
 * Calendar date keys (YYYY-MM-DD) in a specific IANA timezone.
 * Built from Intl calendar parts — never `Date.toISOString()` for day keys.
 */

import { getDeviceTimeZone } from './device'

function calendarParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value

  if (!year || !month || !day) {
    throw new Error('Could not resolve calendar date parts')
  }

  return { year: Number(year), month: Number(month), day: Number(day) }
}

export function formatCalendarDateKey(date: Date, timeZone: string): string {
  const { year, month, day } = calendarParts(date, timeZone)
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

/** Device-local calendar day for agenda UI (date strip, "Today"). */
export function formatDeviceCalendarDateKey(date: Date = new Date()): string {
  return formatCalendarDateKey(date, getDeviceTimeZone())
}

export function isCalendarDateKey(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const probe = new Date(Date.UTC(year, month - 1, day))
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  )
}

function parseDateKey(dateKey: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateKey.split('-').map(Number)
  return { year, month, day }
}

/** Add whole calendar days to a date key, stepping in `timeZone`. */
export function addCalendarDays(dateKey: string, days: number, timeZone: string): string {
  if (days <= 0) return dateKey

  let result = dateKey
  for (let step = 0; step < days; step += 1) {
    const { year, month, day } = parseDateKey(result)
    const probe = new Date(Date.UTC(year, month - 1, day + 1, 12, 0, 0))
    result = formatCalendarDateKey(probe, timeZone)
  }
  return result
}

function dateFromKeyAtNoonUtc(dateKey: string): Date {
  const { year, month, day } = parseDateKey(dateKey)
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
}

export function calendarWeekdayShort(dateKey: string, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: 'short',
  }).format(dateFromKeyAtNoonUtc(dateKey))
}

export function calendarDayOfMonth(dateKey: string, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    day: 'numeric',
  }).format(dateFromKeyAtNoonUtc(dateKey))
}

export function calendarWeekdayLong(dateKey: string, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: 'long',
  }).format(dateFromKeyAtNoonUtc(dateKey))
}

export function calendarMonthDayLabel(dateKey: string, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    month: 'short',
    day: 'numeric',
  }).format(dateFromKeyAtNoonUtc(dateKey))
}

export function isDeviceCalendarToday(dateKey: string, now = new Date()): boolean {
  return dateKey === formatDeviceCalendarDateKey(now)
}

/** "Today, Oct 8" on the device's current day, otherwise "Oct 8". */
export function calendarDayHeading(dateKey: string, timeZone: string): string {
  const label = calendarMonthDayLabel(dateKey, timeZone)
  return isDeviceCalendarToday(dateKey) ? `Today, ${label}` : label
}
