export interface SwimClass {
  id: string
  instructor_id: string
  name: string
  location: string | null
  schedule_details: string | null
  timezone: string
  class_code: string
  max_capacity: number | null
  created_at: string
}

import type { NewClassScheduleInput } from '../lib/classSchedule'

export interface SwimClassInsert {
  name: string
  location?: string | null
  max_capacity?: number | null
  schedule: NewClassScheduleInput
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
