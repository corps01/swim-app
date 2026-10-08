import type { AgendaSession } from './api/agenda'
import { shiftForSession } from './instructorAgendaLayout'

export type SessionTimingBadge = 'next_up' | 'in_session' | 'later' | 'morning' | 'evening'

function sessionStartMinutes(startTime: string): number {
  const [hh, mm] = startTime.split(':')
  return Number(hh) * 60 + Number(mm?.slice(0, 2) ?? 0)
}

function sessionEndMinutes(endTime: string): number {
  const [hh, mm] = endTime.split(':')
  return Number(hh) * 60 + Number(mm?.slice(0, 2) ?? 0)
}

export function nowMinutesInTimeZone(timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  return hour * 60 + minute
}

function sessionPoolTimeZone(session: AgendaSession): string {
  const tz = session.timezone?.trim()
  return tz || 'UTC'
}

/** Next or in-progress session; each candidate uses that session's pool timezone. */
export function pickNextSessionId(sessions: AgendaSession[], isToday: boolean): string | null {
  if (!isToday || sessions.length === 0) return null

  const sorted = [...sessions].sort((a, b) => a.startTime.localeCompare(b.startTime))

  for (const session of sorted) {
    const tz = sessionPoolTimeZone(session)
    const now = nowMinutesInTimeZone(tz)
    const start = sessionStartMinutes(session.startTime)
    const end = sessionEndMinutes(session.endTime)
    if (now >= start && now < end) {
      return sessionCardKey(session)
    }
  }

  for (const session of sorted) {
    const tz = sessionPoolTimeZone(session)
    const now = nowMinutesInTimeZone(tz)
    if (sessionStartMinutes(session.startTime) > now) {
      return sessionCardKey(session)
    }
  }

  return null
}

export function sessionCardKey(session: AgendaSession): string {
  return `${session.scheduleRuleId}-${session.startTime}`
}

export function timingBadgeForSession(
  session: AgendaSession,
  nextSessionKey: string | null,
  isToday: boolean,
): SessionTimingBadge {
  const key = sessionCardKey(session)
  if (isToday && nextSessionKey === key) {
    const tz = sessionPoolTimeZone(session)
    const now = nowMinutesInTimeZone(tz)
    const start = sessionStartMinutes(session.startTime)
    const end = sessionEndMinutes(session.endTime)
    if (now >= start && now < end) return 'in_session'
    return 'next_up'
  }

  const shift = shiftForSession(session)
  if (shift === 'morning') return 'morning'
  if (shift === 'evening') return 'evening'
  return 'later'
}

export function greetingForTimeZone(timeZone: string): string {
  const hour = Math.floor(nowMinutesInTimeZone(timeZone) / 60)
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
