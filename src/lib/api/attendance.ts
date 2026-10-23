import { formatAppError, throwIfSupabaseError } from '../errors'
import { getSupabaseClient } from '../supabase'
import {
  getAttendanceMap,
  replaceAttendanceMap,
  type AttendanceMark,
} from '../sessionAttendance'

const SQL_HINT = 'Run docs/sql/11-attendance.sql in the Supabase SQL editor.'

export function attendanceTableMissing(error: unknown): boolean {
  const message = String((error as { message?: string } | null)?.message ?? '').toLowerCase()
  return message.includes('attendance_logs') || message.includes('11-attendance')
}

export async function loadSessionAttendance(
  classId: string,
  dateKey: string,
): Promise<{ marks: Record<string, AttendanceMark>; synced: boolean; warning: string | null }> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('attendance_logs')
    .select('child_id, mark')
    .eq('class_id', classId)
    .eq('session_date', dateKey)

  if (error) {
    if (attendanceTableMissing(error)) {
      return {
        marks: getAttendanceMap(classId, dateKey),
        synced: false,
        warning: `Attendance is still on this device. ${SQL_HINT}`,
      }
    }
    throw new Error(formatAppError(error))
  }

  const marks: Record<string, AttendanceMark> = {}
  for (const row of data ?? []) {
    const record = row as { child_id?: string; mark?: string }
    if (!record.child_id) continue
    if (record.mark === 'present' || record.mark === 'absent') marks[record.child_id] = record.mark
  }
  replaceAttendanceMap(classId, dateKey, marks)
  return { marks, synced: true, warning: null }
}

export async function persistAttendanceMark(input: {
  classId: string
  dateKey: string
  childId: string
  mark: AttendanceMark
  markedBy: string
}): Promise<void> {
  const supabase = getSupabaseClient()
  if (input.mark === 'unmarked') {
    const { error } = await supabase
      .from('attendance_logs')
      .delete()
      .eq('class_id', input.classId)
      .eq('child_id', input.childId)
      .eq('session_date', input.dateKey)
    if (error && attendanceTableMissing(error)) {
      throw new Error(`Attendance is still on this device. ${SQL_HINT}`)
    }
    throwIfSupabaseError(error)
    return
  }

  const { error } = await supabase.from('attendance_logs').upsert(
    {
      class_id: input.classId,
      child_id: input.childId,
      session_date: input.dateKey,
      mark: input.mark,
      marked_by: input.markedBy,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'class_id,child_id,session_date' },
  )
  if (error && attendanceTableMissing(error)) {
    throw new Error(`Attendance is still on this device. ${SQL_HINT}`)
  }
  throwIfSupabaseError(error)
}
