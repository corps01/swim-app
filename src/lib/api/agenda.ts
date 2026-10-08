import { formatAppError } from '../errors'
import { getSupabaseClient } from '../supabase'

export interface AgendaSwimmerSummary {
  childId: string
  firstName: string
  lastName: string
  hasMedicalFlag: boolean
  hasFormAlert: boolean
  enrollmentStatus: 'active' | 'pending' | 'inactive'
}

export interface AgendaSession {
  scheduleRuleId: string
  classId: string
  className: string
  classCode: string
  timezone: string
  location: string | null
  locationDetail: string | null
  startTime: string
  endTime: string
  seasonStart: string | null
  seasonEnd: string | null
  recurringDaysLabel: string | null
  durationMinutes: number | null
  swimmers: AgendaSwimmerSummary[]
}

export interface InstructorAgenda {
  date: string
  sessions: AgendaSession[]
}

function parseAgendaSwimmer(raw: unknown): AgendaSwimmerSummary | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  if (typeof row.child_id !== 'string' || typeof row.first_name !== 'string') return null
  const statusRaw = row.enrollment_status
  const enrollmentStatus =
    statusRaw === 'pending' || statusRaw === 'inactive' || statusRaw === 'active'
      ? statusRaw
      : 'active'

  return {
    childId: row.child_id,
    firstName: row.first_name,
    lastName: typeof row.last_name === 'string' ? row.last_name : '',
    hasMedicalFlag: row.has_medical_flag === true,
    hasFormAlert: row.has_form_alert === true,
    enrollmentStatus,
  }
}

function parseAgendaSession(raw: unknown): AgendaSession | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  if (
    typeof row.schedule_rule_id !== 'string' ||
    typeof row.class_id !== 'string' ||
    typeof row.class_name !== 'string' ||
    typeof row.start_time !== 'string' ||
    typeof row.end_time !== 'string'
  ) {
    return null
  }

  const swimmersRaw = row.swimmers
  const swimmers: AgendaSwimmerSummary[] = []
  if (Array.isArray(swimmersRaw)) {
    for (const entry of swimmersRaw) {
      const parsed = parseAgendaSwimmer(entry)
      if (parsed) swimmers.push(parsed)
    }
  }

  return {
    scheduleRuleId: row.schedule_rule_id,
    classId: row.class_id,
    className: row.class_name,
    classCode: typeof row.class_code === 'string' ? row.class_code : '',
    timezone: typeof row.timezone === 'string' ? row.timezone : 'UTC',
    location: typeof row.location === 'string' ? row.location : null,
    locationDetail: typeof row.location_detail === 'string' ? row.location_detail : null,
    startTime: row.start_time,
    endTime: row.end_time,
    seasonStart: typeof row.season_start === 'string' ? row.season_start : null,
    seasonEnd: typeof row.season_end === 'string' ? row.season_end : null,
    recurringDaysLabel:
      typeof row.recurring_days_label === 'string' ? row.recurring_days_label : null,
    durationMinutes: typeof row.duration_minutes === 'number' ? row.duration_minutes : null,
    swimmers,
  }
}

function parseAgendaPayload(data: unknown, fallbackDate: string): InstructorAgenda {
  if (!data || typeof data !== 'object') {
    return { date: fallbackDate, sessions: [] }
  }
  const row = data as Record<string, unknown>
  const date = typeof row.date === 'string' ? row.date : fallbackDate
  const sessions: AgendaSession[] = []
  if (Array.isArray(row.sessions)) {
    for (const entry of row.sessions) {
      const parsed = parseAgendaSession(entry)
      if (parsed) sessions.push(parsed)
    }
  }
  return { date, sessions }
}

export async function fetchInstructorAgenda(agendaDate: string): Promise<InstructorAgenda> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('get_instructor_agenda', {
    p_date: agendaDate,
  })

  if (error) throw new Error(formatAppError(error))
  return parseAgendaPayload(data, agendaDate)
}
