export interface SwimClass {
  id: string
  instructor_id: string
  name: string
  location: string | null
  schedule_details: string | null
  class_code: string
  max_capacity: number | null
  created_at: string
}

export interface SwimClassInsert {
  name: string
  location?: string | null
  schedule_details?: string | null
  max_capacity?: number | null
}

export interface ResolvedClassInvite {
  classId: string
  instructorId: string
  instructorName: string
  className: string
  classCode: string
  location: string | null
  scheduleDetails: string | null
}
