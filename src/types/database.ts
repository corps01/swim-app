export type UserRole = 'instructor' | 'parent'

export type ChildInstructorStatus = 'active' | 'inactive' | 'pending'

export interface Profile {
  id: string
  role: UserRole
  full_name: string
  phone: string | null
  created_at: string
}

export interface ProfileInsert {
  id: string
  role: UserRole
  full_name: string
  phone?: string | null
}

export interface Child {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  notes: string | null
  created_at: string
}

export interface ChildInsert {
  first_name: string
  last_name: string
  date_of_birth: string
  notes?: string | null
}

export interface ParentChildRelationship {
  id: string
  parent_id: string
  child_id: string
  relationship: string | null
  created_at: string
}

export interface ParentChildRelationshipInsert {
  parent_id: string
  child_id: string
  relationship?: string | null
}

export interface ChildInstructorRelationship {
  id: string
  child_id: string
  instructor_id: string
  status: ChildInstructorStatus
  created_at: string
}

export interface ChildInstructorRelationshipInsert {
  child_id: string
  instructor_id: string
  status?: ChildInstructorStatus
}
