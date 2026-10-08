import type { ChildInstructorStatus } from '../../types/database'
import { throwIfSupabaseError } from '../errors'
import { getSupabaseClient } from '../supabase'

export interface SessionDeckSwimmer {
  childId: string
  firstName: string
  lastName: string
  notes: string
  parentName: string
  parentPhone: string | null
  enrollmentStatus: ChildInstructorStatus
  hasFormAlert: boolean
}

export interface SessionDeckClassMeta {
  id: string
  name: string
  location: string | null
  scheduleDetails: string | null
}

export async function fetchSessionDeckSwimmers(classId: string): Promise<SessionDeckSwimmer[]> {
  const supabase = getSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  throwIfSupabaseError(authError)
  if (!user) throw new Error('You must be signed in.')

  const instructorId = user.id

  const { data: links, error: linksError } = await supabase
    .from('child_instructor_relationships')
    .select('child_id, status')
    .eq('instructor_id', instructorId)
    .eq('class_id', classId)
    .in('status', ['active', 'pending'])

  throwIfSupabaseError(linksError)
  if (!links?.length) return []

  const childIds = links.map((row) => row.child_id)
  const statusByChild = new Map(links.map((row) => [row.child_id, row.status as ChildInstructorStatus]))

  const { data: children, error: childrenError } = await supabase
    .from('children')
    .select('id, first_name, last_name, notes')
    .in('id', childIds)

  throwIfSupabaseError(childrenError)

  const { data: parentLinks, error: parentLinksError } = await supabase
    .from('parent_child_relationships')
    .select('child_id, parent_id')
    .in('child_id', childIds)

  throwIfSupabaseError(parentLinksError)

  const parentIds = [...new Set((parentLinks ?? []).map((row) => row.parent_id))]
  const parentProfileById = new Map<string, { name: string; phone: string | null }>()

  if (parentIds.length > 0) {
    const { data: parents, error: parentsError } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .in('id', parentIds)

    throwIfSupabaseError(parentsError)
    for (const parent of parents ?? []) {
      parentProfileById.set(parent.id, {
        name: parent.full_name,
        phone: parent.phone ?? null,
      })
    }
  }

  const parentByChild = new Map<string, { name: string; phone: string | null }>()
  for (const row of parentLinks ?? []) {
    const profile = parentProfileById.get(row.parent_id)
    if (profile) parentByChild.set(row.child_id, profile)
  }

  return (children ?? [])
    .map((child) => {
      const status = statusByChild.get(child.id) ?? 'active'
      const parent = parentByChild.get(child.id)
      const notes = (child.notes ?? '').trim()
      return {
        childId: child.id,
        firstName: child.first_name,
        lastName: child.last_name,
        notes,
        parentName: parent?.name ?? 'Parent',
        parentPhone: parent?.phone ?? null,
        enrollmentStatus: status,
        hasFormAlert: status !== 'active',
      }
    })
    .sort((a, b) => a.firstName.localeCompare(b.firstName))
}

export async function fetchSessionDeckClass(classId: string): Promise<SessionDeckClassMeta | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('classes')
    .select('id, name, location, schedule_details')
    .eq('id', classId)
    .maybeSingle()

  throwIfSupabaseError(error)
  if (!data) return null
  return {
    id: data.id,
    name: data.name,
    location: data.location,
    scheduleDetails: data.schedule_details,
  }
}
