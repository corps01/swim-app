import { formatAppError } from '../errors'
import { getSupabaseClient } from '../supabase'

/** Parent leaves a class (removes child_instructor_relationship for that class). */
export async function leaveClassEnrollment(parentUserId: string, childId: string, classId: string) {
  const supabase = getSupabaseClient()

  const { data: link, error: linkError } = await supabase
    .from('parent_child_relationships')
    .select('child_id')
    .eq('parent_id', parentUserId)
    .eq('child_id', childId)
    .maybeSingle()

  if (linkError) throw new Error(formatAppError(linkError))
  if (!link) throw new Error('This swimmer is not on your account.')

  const { error } = await supabase
    .from('child_instructor_relationships')
    .delete()
    .eq('child_id', childId)
    .eq('class_id', classId)

  if (error) throw new Error(formatAppError(error))
}
