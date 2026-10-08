import type { ChildInstructorStatus } from '../../types/database'
import { throwIfSupabaseError } from '../errors'
import { getSupabaseClient } from '../supabase'

export interface InstructorRosterEntry {
  childId: string
  firstName: string
  lastName: string
  parentName: string
  classLabel: string
  classId: string | null
  status: ChildInstructorStatus
}

export async function fetchInstructorRoster(classId?: string): Promise<InstructorRosterEntry[]> {
  const supabase = getSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  throwIfSupabaseError(authError)
  if (!user) {
    throw new Error('You must be signed in to view the roster.')
  }

  const instructorId = user.id

  // RLS on child_instructor_relationships only returns rows for auth.uid(); filter matches session.
  let linksQuery = supabase
    .from('child_instructor_relationships')
    .select('child_id, status, class_id')
    .eq('instructor_id', instructorId)
    .eq('status', 'active')

  if (classId) {
    linksQuery = linksQuery.eq('class_id', classId)
  }

  const { data: links, error: linksError } = await linksQuery

  throwIfSupabaseError(linksError)
  if (!links?.length) return []

  const childIds = links.map((row) => row.child_id)
  const statusByChild = new Map(links.map((row) => [row.child_id, row.status as ChildInstructorStatus]))
  const classIdByChild = new Map(links.map((row) => [row.child_id, row.class_id as string | null]))

  const classIds = [...new Set(links.map((row) => row.class_id).filter(Boolean))] as string[]
  const classNameById = new Map<string, string>()

  if (classIds.length > 0) {
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('id, name')
      .in('id', classIds)

    throwIfSupabaseError(classesError)
    for (const swimClass of classes ?? []) {
      classNameById.set(swimClass.id, swimClass.name)
    }
  }

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

  return (children ?? []).map((child) => {
    const cid = classIdByChild.get(child.id) ?? null
    const classLabel = cid ? (classNameById.get(cid) ?? 'Class') : 'Class'

    return {
      childId: child.id,
      firstName: child.first_name,
      lastName: child.last_name,
      parentName: parentByChild.get(child.id) ?? 'Parent',
      classLabel,
      classId: cid,
      status: statusByChild.get(child.id) ?? 'active',
    }
  })
}
