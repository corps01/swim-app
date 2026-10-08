import { formatDateOnlyForDisplay } from './dateOnly'

/** ISO weekday: 1 = Monday … 7 = Sunday */
export const ISO_WEEKDAYS: { value: number; label: string; short: string }[] = [
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
  { value: 7, label: 'Sunday', short: 'Sun' },
]

export interface NewClassScheduleInput {
  daysOfWeek: number[]
  startTime: string
  endTime: string
  locationDetail?: string | null
  seasonStart?: string | null
  seasonEnd?: string | null
}

export function formatTime12h(hhmm: string): string {
  const [hh, mm] = hhmm.split(':')
  const hour = Number(hh)
  const minute = (mm ?? '00').slice(0, 2).padStart(2, '0')
  const period = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${h12}:${minute} ${period}`
}

export function formatTimeRange12h(start: string, end: string): string {
  return `${formatTime12h(start)} – ${formatTime12h(end)}`
}

export function validateClassSchedule(schedule: NewClassScheduleInput): string | null {
  if (schedule.daysOfWeek.length === 0) {
    return 'Select at least one day this class meets.'
  }
  if (!schedule.startTime || !schedule.endTime) {
    return 'Start and end times are required.'
  }
  if (schedule.startTime >= schedule.endTime) {
    return 'End time must be after start time.'
  }
  if (
    schedule.seasonStart &&
    schedule.seasonEnd &&
    schedule.seasonEnd < schedule.seasonStart
  ) {
    return 'Season end must be on or after season start.'
  }
  return null
}

/** "Season: Oct 1, 2026 – Dec 15, 2026", or a one-sided range when only one date is set. */
export function formatSeasonRangeLabel(
  seasonStart: string | null | undefined,
  seasonEnd: string | null | undefined,
): string | null {
  const start = seasonStart?.trim() ? formatDateOnlyForDisplay(seasonStart) : ''
  const end = seasonEnd?.trim() ? formatDateOnlyForDisplay(seasonEnd) : ''
  if (start && end) return `Season: ${start} – ${end}`
  if (start) return `Season: from ${start}`
  if (end) return `Season: through ${end}`
  return null
}

/** Normalize `<input type="time">` value to HH:MM:SS for Postgres `time`. */
export function toPostgresTime(hhmm: string): string {
  const parts = hhmm.split(':')
  const hh = parts[0]?.padStart(2, '0') ?? '00'
  const mm = parts[1]?.padStart(2, '0') ?? '00'
  return `${hh}:${mm}:00`
}
