export interface ChildEnrollmentDraft {
  firstName: string
  lastName: string
  dateOfBirth: string
  notes: string
}

export interface EnrollChildInput {
  parentUserId: string
  child: ChildEnrollmentDraft
  instructorCode: string
}

export interface EnrollChildResult {
  childId: string
  instructorId: string
}
