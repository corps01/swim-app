export type AttendanceMark = 'unmarked' | 'present' | 'absent'

export function attendanceStorageKey(classId: string, dateKey: string): string {
  return `attendance_${classId}_${dateKey}`
}

function readStore(classId: string, dateKey: string): Record<string, AttendanceMark> {
  try {
    const raw = localStorage.getItem(attendanceStorageKey(classId, dateKey))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, AttendanceMark>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function getAttendanceMap(classId: string, dateKey: string): Record<string, AttendanceMark> {
  return readStore(classId, dateKey)
}

export function getAttendanceMark(
  classId: string,
  dateKey: string,
  childId: string,
): AttendanceMark {
  return readStore(classId, dateKey)[childId] ?? 'unmarked'
}

export function setAttendanceMark(
  classId: string,
  dateKey: string,
  childId: string,
  mark: AttendanceMark,
): Record<string, AttendanceMark> {
  const next = { ...readStore(classId, dateKey), [childId]: mark }
  localStorage.setItem(attendanceStorageKey(classId, dateKey), JSON.stringify(next))
  return next
}

export function cycleAttendanceMark(current: AttendanceMark): AttendanceMark {
  if (current === 'unmarked') return 'present'
  if (current === 'present') return 'absent'
  return 'unmarked'
}

export function countAttendance(marks: Record<string, AttendanceMark>, rosterSize: number) {
  let present = 0
  let absent = 0
  for (const mark of Object.values(marks)) {
    if (mark === 'present') present += 1
    if (mark === 'absent') absent += 1
  }
  const unmarked = Math.max(0, rosterSize - present - absent)
  return { present, absent, unmarked }
}
