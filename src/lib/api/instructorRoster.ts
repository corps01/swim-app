import type { ChildInstructorStatus } from '../../types/database'
import { throwIfSupabaseError } from '../errors'
import { PLACEHOLDER_CLASS_LABEL } from './instructors'
import { getSupabaseClient } from '../supabase'

export interface InstructorRosterEntry {
  childId: string
  firstName: string
  lastName: string
  parentName: string
  classLabel: string
  status: ChildInstructorStatus
}

export async function fetchInstructorRoster(instructorId: string): Promise<InstructorRosterEntry[]> {
  const supabase = getSupabaseClient()

  const { data: links, error: linksError } = await supabase
    .from('child_instructor_relationships')
    .select('child_id, status')
    .eq('instructor_id', instructorId)
    .eq('status', 'active')

  throwIfSupabaseError(linksError)
  if (!links?.length) return []

  const childIds = links.map((row) => row.child_id)
  const statusByChild = new Map(links.map((row) => [row.child_id, row.status as ChildInstructorStatus]))

  const { data: children, error: childrenError } = await supabase
    .from('children')
    .select('id, first_name, last_name')
    .in('id', childIds)

  throwIfSupabaseError(childrenError)

  const { data: parentLinks, error: parentLinksError } = await supabase
    .from('parent_child_relationships')
    .select('child_id, parent_id')
    .in('child_id', childIds)

  throwIfSupabaseError(parentLinksError)

  const parentIds = [...new Set((parentLinks ?? []).map((row) => row.parent_id))]
  const parentNameById = new Map<string, string>()

  if (parentIds.length > 0) {
    const { data: parents, error: parentsError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', parentIds)

    throwIfSupabaseError(parentsError)
    for (const parent of parents ?? []) {
      parentNameById.set(parent.id, parent.full_name)
    }
  }

  const parentByChild = new Map<string, string>()
  for (const row of parentLinks ?? []) {
    const name = parentNameById.get(row.parent_id)
    if (name) {
      parentByChild.set(row.child_id, name)
    }
  }

  return (children ?? []).map((child) => ({
    childId: child.id,
    firstName: child.first_name,
    lastName: child.last_name,
    parentName: parentByChild.get(child.id) ?? 'Parent',
    classLabel: PLACEHOLDER_CLASS_LABEL,
    status: statusByChild.get(child.id) ?? 'active',
  }))
}
