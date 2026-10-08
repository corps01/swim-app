import type { AgendaSession } from './api/agenda'
import { formatTime12h } from './classSchedule'

export type AgendaShiftId = 'morning' | 'afternoon' | 'evening'

interface AgendaLocationGroup {
  locationKey: string
  locationLabel: string
  sessions: AgendaSession[]
}

interface AgendaShiftGroup {
  shift: AgendaShiftId
  title: string
  timeRangeLabel: string
  locationGroups: AgendaLocationGroup[]
}

function startHour(startTime: string): number {
  return Number(startTime.split(':')[0] ?? 0)
}

export function shiftForSession(session: AgendaSession): AgendaShiftId {
  const hour = startHour(session.startTime)
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

const SHIFT_TITLES: Record<AgendaShiftId, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
}

function shiftTimeRangeLabel(sessions: AgendaSession[]): string {
  if (sessions.length === 0) return ''
  const starts = sessions.map((s) => s.startTime).sort()
  const ends = sessions.map((s) => s.endTime).sort()
  return `${formatTime12h(starts[0])} – ${formatTime12h(ends[ends.length - 1])}`
}

function locationKey(session: AgendaSession): string {
  const base = session.location?.trim().toLowerCase() || 'unknown'
  const detail = session.locationDetail?.trim().toLowerCase() || ''
  return `${base}|${detail}`
}

function locationLabel(session: AgendaSession): string {
  const base = session.location?.trim() || 'Location TBD'
  const detail = session.locationDetail?.trim()
  return detail ? `${base} — ${detail}` : base
}

/** Chronological sessions → shift brackets → location sub-groups (multi-pool days). */
export function groupAgendaSessions(sessions: AgendaSession[]): AgendaShiftGroup[] {
  const sorted = [...sessions].sort((a, b) => a.startTime.localeCompare(b.startTime))
  const shiftOrder: AgendaShiftId[] = ['morning', 'afternoon', 'evening']
  const byShift = new Map<AgendaShiftId, AgendaSession[]>()

  for (const session of sorted) {
    const shift = shiftForSession(session)
    const bucket = byShift.get(shift) ?? []
    bucket.push(session)
    byShift.set(shift, bucket)
  }

  return shiftOrder
    .filter((shift) => byShift.has(shift))
    .map((shift) => {
      const shiftSessions = byShift.get(shift) ?? []
      const locationMap = new Map<string, AgendaSession[]>()
      for (const session of shiftSessions) {
        const key = locationKey(session)
        const list = locationMap.get(key) ?? []
        list.push(session)
        locationMap.set(key, list)
      }

      const locationGroups: AgendaLocationGroup[] = [...locationMap.entries()].map(
        ([key, groupSessions]) => ({
          locationKey: key,
          locationLabel: locationLabel(groupSessions[0]),
          sessions: groupSessions.sort((a, b) => a.startTime.localeCompare(b.startTime)),
        }),
      )

      return {
        shift,
        title: SHIFT_TITLES[shift],
        locationGroups,
        timeRangeLabel: shiftTimeRangeLabel(shiftSessions),
      }
    })
}
