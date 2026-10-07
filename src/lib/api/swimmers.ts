import type { SwimmerRosterEntry } from '../swimmers'
import { throwIfSupabaseError } from '../errors'
import { getSupabaseClient } from '../supabase'

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
    .select('child_id, status, instructor_id')
    .in('child_id', childIds)

  throwIfSupabaseError(instructorError)

  const instructorIds = [
    ...new Set((instructorLinks ?? []).map((row) => row.instructor_id)),
  ]

  const instructorNames = new Map<string, string>()
  if (instructorIds.length > 0) {
    const { data: instructors, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', instructorIds)

    throwIfSupabaseError(profilesError)
    for (const instructor of instructors ?? []) {
      instructorNames.set(instructor.id, instructor.full_name)
    }
  }

  const instructorByChild = new Map(
    (instructorLinks ?? []).map((row) => [row.child_id, row]),
  )

  return (children ?? []).map((child) => {
    const link = instructorByChild.get(child.id)
    const instructorName = link ? instructorNames.get(link.instructor_id) : undefined
    const pending = link?.status === 'pending'

    return {
      id: child.id,
      firstName: child.first_name,
      lastName: child.last_name,
      dateOfBirth: child.date_of_birth,
      notes: child.notes ?? '',
      instructorName: instructorName ?? 'Instructor',
      classLabel: pending ? 'Pending instructor approval' : 'Active class',
      coachName: instructorName ? `Coach ${instructorName.split(' ')[0]}` : 'Coach',
      sessionLabel: 'Upcoming session',
      levelLabel: 'Swimmer',
      formStatus: pending ? 'missing' : 'completed',
      signedAtLabel: pending ? undefined : 'Linked',
    }
  })
}
