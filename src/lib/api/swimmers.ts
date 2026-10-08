import type { ChildInstructorStatus } from '../../types/database'
import { normalizeDateOnlyString } from '../dateOnly'
import type { SwimmerClassEnrollment, SwimmerRosterEntry } from '../swimmers'
import { throwIfSupabaseError } from '../errors'
import { getSupabaseClient } from '../supabase'

type ClassRow = {
  id: string
  name: string
  schedule_details: string | null
  location: string | null
}

type InstructorLinkRow = {
  child_id: string
  status: ChildInstructorStatus
  instructor_id: string
  class_id: string | null
  classes: ClassRow | ClassRow[] | null
}

function normalizeEmbeddedClass(value: ClassRow | ClassRow[] | null): ClassRow | null {
  if (!value) return null
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

function mapLinkToEnrollment(
  link: InstructorLinkRow,
  instructorNameById: Map<string, string>,
): SwimmerClassEnrollment {
  const swimClass = normalizeEmbeddedClass(link.classes)
  return {
    classId: link.class_id,
    className: swimClass?.name ?? null,
    scheduleDetails: swimClass?.schedule_details ?? null,
    location: swimClass?.location ?? null,
    instructorName: instructorNameById.get(link.instructor_id) ?? null,
    status: link.status,
  }
}

export async function fetchParentSwimmers(parentId: string): Promise<SwimmerRosterEntry[]> {
  const supabase = getSupabaseClient()

  const { data: parentLinks, error: parentError } = await supabase
    .from('parent_child_relationships')
    .select('child_id')
    .eq('parent_id', parentId)

  throwIfSupabaseError(parentError)
  if (!parentLinks?.length) return []

  const childIds = parentLinks.map((row) => row.child_id)

  const { data: children, error: childrenError } = await supabase
    .from('children')
    .select('id, first_name, last_name, date_of_birth, notes')
    .in('id', childIds)

  throwIfSupabaseError(childrenError)

  const { data: instructorLinks, error: instructorError } = await supabase
    .from('child_instructor_relationships')
    .select(
      `
      child_id,
      status,
      instructor_id,
      class_id,
      classes (
        id,
        name,
        schedule_details,
        location
      )
    `,
    )
    .in('child_id', childIds)

  throwIfSupabaseError(instructorError)

  const links = (instructorLinks ?? []) as InstructorLinkRow[]
  const instructorIds = [...new Set(links.map((row) => row.instructor_id))]

  const instructorNameById = new Map<string, string>()
  if (instructorIds.length > 0) {
    const { data: instructors, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', instructorIds)

    throwIfSupabaseError(profilesError)
    for (const instructor of instructors ?? []) {
      instructorNameById.set(instructor.id, instructor.full_name)
    }
  }

  const linksByChild = new Map<string, InstructorLinkRow[]>()
  for (const link of links) {
    const bucket = linksByChild.get(link.child_id) ?? []
    bucket.push(link)
    linksByChild.set(link.child_id, bucket)
  }

  return (children ?? []).map((child) => {
    const childLinks = linksByChild.get(child.id) ?? []
    const enrollments = childLinks.map((link) => mapLinkToEnrollment(link, instructorNameById))
    const hasActiveClass = enrollments.some((row) => row.status === 'active' && row.classId)

    return {
      id: child.id,
      firstName: child.first_name,
      lastName: child.last_name,
      dateOfBirth: normalizeDateOnlyString(String(child.date_of_birth ?? '')),
      notes: child.notes ?? '',
      enrollments,
      enrollmentBadge: hasActiveClass ? 'enrolled' : 'not_enrolled',
    }
  })
}
