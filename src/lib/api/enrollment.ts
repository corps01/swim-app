import type { EnrollChildInput, EnrollChildResult } from '../../types/enrollment'
import { lookupInstructorByCode } from './instructors'
import { getSupabaseClient } from '../supabase'

function validateChildInput(child: EnrollChildInput['child']) {
  if (!child.firstName.trim() || !child.lastName.trim() || !child.dateOfBirth) {
    throw new Error('Child name and date of birth are required.')
  }
}

async function resolveInstructorId(code: string): Promise<string> {
  const instructor = await lookupInstructorByCode(code)
  if (!instructor) {
    throw new Error(
      'Instructor not found. Use the invite ID (UUID) your instructor shared with you.',
    )
  }
  return instructor.id
}

/**
 * Creates a child row and links them to the signed-in parent and instructor.
 */
export async function enrollChild(input: EnrollChildInput): Promise<EnrollChildResult> {
  validateChildInput(input.child)

  const instructorId = await resolveInstructorId(input.instructorCode)
  const supabase = getSupabaseClient()

  const { data: childRow, error: childError } = await supabase
    .from('children')
    .insert({
      first_name: input.child.firstName.trim(),
      last_name: input.child.lastName.trim(),
      date_of_birth: input.child.dateOfBirth,
      notes: input.child.notes.trim() || null,
    })
    .select('id')
    .single()

  if (childError) throw childError

  const { error: parentLinkError } = await supabase.from('parent_child_relationships').insert({
    parent_id: input.parentUserId,
    child_id: childRow.id,
    relationship: 'parent',
  })

  if (parentLinkError) throw parentLinkError

  const { error: instructorLinkError } = await supabase
    .from('child_instructor_relationships')
    .insert({
      child_id: childRow.id,
      instructor_id: instructorId,
      status: 'pending',
    })

  if (instructorLinkError) throw instructorLinkError

  return {
    childId: childRow.id,
    instructorId,
  }
}
