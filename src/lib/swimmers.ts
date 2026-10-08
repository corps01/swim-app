import { ageFromDateOnly, formatDateOnlyForDisplay } from './dateOnly'

export type ParentEnrollmentBadge = 'enrolled' | 'not_enrolled'

export interface SwimmerClassEnrollment {
  classId: string | null
  className: string | null
  scheduleDetails: string | null
  location: string | null
  instructorName: string | null
  seasonStart: string | null
  seasonEnd: string | null
  status: 'active' | 'pending' | 'inactive'
}

export interface SwimmerRosterEntry {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: string
  notes: string
  enrollments: SwimmerClassEnrollment[]
  enrollmentBadge: ParentEnrollmentBadge
}

export function formatDateOfBirth(isoDate: string): string {
  return formatDateOnlyForDisplay(isoDate)
}

export function ageFromDateOfBirth(isoDate: string): number | null {
  return ageFromDateOnly(isoDate)
}

export function swimmerHasActiveClass(enrollment: SwimmerRosterEntry): boolean {
  return enrollment.enrollments.some((row) => row.status === 'active' && Boolean(row.classId))
}
