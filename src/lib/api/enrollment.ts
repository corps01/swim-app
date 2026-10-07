import type { ChildEnrollmentDraft, EnrollChildInput, EnrollChildResult } from '../../types/enrollment'
import { formatAppError } from '../errors'
import { lookupInstructorByCode, PLACEHOLDER_CLASS_LABEL, type InstructorOption } from './instructors'
import { assertParentEnrollmentSession } from './sessionGuards'
import { getSupabaseClient } from '../supabase'

const INVALID_INVITE_MESSAGE = 'Invalid invite code'

function validateNewChild(child: ChildEnrollmentDraft) {
  if (!child.firstName.trim() || !child.lastName.trim() || !child.dateOfBirth) {
    throw new Error('Child name and date of birth are required.')
  }
}

function resolveChildTarget(input: EnrollChildInput): 'existing' | 'new' {
  const hasChildId = Boolean(input.childId?.trim())
  const hasNewChild = Boolean(input.child)

  if (hasChildId && hasNewChild) {
    throw new Error('Choose either an existing swimmer or enter details for a new one.')
  }
  if (!hasChildId && !hasNewChild) {
    throw new Error('Select an existing swimmer or add a new one.')
  }
  return hasChildId ? 'existing' : 'new'
}

/** Resolves an instructor from an invite code (instructor profile UUID). */
export async function resolveInstructorInviteCode(code: string): Promise<InstructorOption> {
  const instructor = await lookupInstructorByCode(code)
  if (!instructor) {
    throw new Error(INVALID_INVITE_MESSAGE)
  }
  return instructor
}

async function verifyParentOwnsChild(parentUserId: string, childId: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('parent_child_relationships')
    .select('child_id')
    .eq('parent_id', parentUserId)
    .eq('child_id', childId)
    .maybeSingle()

  if (error) throw new Error(formatAppError(error))
  if (!data) {
    throw new Error('This swimmer is not linked to your account.')
  }
}

async function createChildForParent(child: ChildEnrollmentDraft): Promise<string> {
  validateNewChild(child)
  const supabase = getSupabaseClient()

  const { data: childId, error: childError } = await supabase.rpc('create_child_for_parent', {
    p_first_name: child.firstName.trim(),
    p_last_name: child.lastName.trim(),
    p_date_of_birth: child.dateOfBirth,
    p_notes: child.notes.trim() || null,
  })

  if (childError) {
    throw new Error(formatAppError(childError))
  }

  if (typeof childId !== 'string' || !childId) {
    throw new Error('Could not create swimmer. Please try again.')
  }

  return childId
}

async function linkChildToInstructor(childId: string, instructorId: string): Promise<void> {
  const supabase = getSupabaseClient()

  const { data: existing, error: existingError } = await supabase
    .from('child_instructor_relationships')
    .select('id, status')
    .eq('child_id', childId)
    .eq('instructor_id', instructorId)
    .maybeSingle()

  if (existingError) throw new Error(formatAppError(existingError))

  if (existing) {
    if (existing.status === 'active') {
      throw new Error('This swimmer is already enrolled in this class.')
    }
    const { error: updateError } = await supabase
      .from('child_instructor_relationships')
      .update({ status: 'active' })
      .eq('id', existing.id)

    if (updateError) throw new Error(formatAppError(updateError))
    return
  }

  const { error: instructorLinkError } = await supabase
    .from('child_instructor_relationships')
    .insert({
      child_id: childId,
      instructor_id: instructorId,
      status: 'active',
    })

  if (instructorLinkError) throw new Error(formatAppError(instructorLinkError))
}

/** Enrolls a parent's swimmer in an instructor's class. */
export async function enrollChildInClass(input: EnrollChildInput): Promise<EnrollChildResult> {
  await assertParentEnrollmentSession(input.parentUserId)

  const instructor = await resolveInstructorInviteCode(input.instructorCode)
  const target = resolveChildTarget(input)

  const childId =
    target === 'existing'
      ? input.childId!.trim()
      : await createChildForParent(input.child!)

  if (target === 'existing') {
    await verifyParentOwnsChild(input.parentUserId, childId)
  }

  await linkChildToInstructor(childId, instructor.id)

  return {
    childId,
    instructorId: instructor.id,
    instructorName: instructor.name,
    classLabel: instructor.classLabel || PLACEHOLDER_CLASS_LABEL,
  }
}
