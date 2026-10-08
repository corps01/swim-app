export interface ChildEnrollmentDraft {
  firstName: string
  lastName: string
  dateOfBirth: string
  notes: string
}

export interface EnrollChildInput {
  parentUserId: string
  /** 6-character class code from the instructor */
  classCode: string
  /** Link an existing swimmer already on the parent account */
  childId?: string
  /** Create a new swimmer profile during enrollment */
  child?: ChildEnrollmentDraft
}

export interface EnrollChildResult {
  childId: string
  instructorId: string
  instructorName: string
  classId: string
  classLabel: string
  location: string | null
  scheduleDetails: string | null
}
