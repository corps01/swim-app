export type FormStatus = 'completed' | 'missing'

export interface SwimmerRosterEntry {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: string
  notes: string
  instructorName: string
  classLabel: string
  coachName: string
  sessionLabel: string
  levelLabel: string
  formStatus: FormStatus
  signedAtLabel?: string
}

export function formatDateOfBirth(isoDate: string): string {
  if (!isoDate) return ''
  const dob = new Date(`${isoDate}T12:00:00`)
  if (Number.isNaN(dob.getTime())) return isoDate
  return dob.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function ageFromDateOfBirth(isoDate: string): number | null {
  if (!isoDate) return null
  const dob = new Date(`${isoDate}T12:00:00`)
  if (Number.isNaN(dob.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDelta = today.getMonth() - dob.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dob.getDate())) {
    age -= 1
  }
  return age
}
