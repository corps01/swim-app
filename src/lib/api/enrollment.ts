import type { ChildEnrollmentDraft, EnrollChildInput, EnrollChildResult } from '../../types/enrollment'
import { formatAppError } from '../errors'
import {
  CLASS_CODE_NOT_FOUND_MESSAGE,
  DUPLICATE_CLASS_ENROLLMENT_MESSAGE,
} from '../classCode'
import { normalizeDateOnlyString } from '../dateOnly'
import { resolveClassByCode } from './classes'
import { assertParentEnrollmentSession } from './sessionGuards'
import { getSupabaseClient } from '../supabase'

const INVALID_INVITE_MESSAGE = CLASS_CODE_NOT_FOUND_MESSAGE

function validateNewChild(child: ChildEnrollmentDraft) {
  if (!child.firstName.trim() || !child.lastName.trim() || !child.dateOfBirth) {
    throw new Error('Child name and date of birth are required.')
  }
  if (!normalizeDateOnlyString(child.dateOfBirth)) {
    throw new Error('Date of birth must be a valid YYYY-MM-DD value.')
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

/** Resolves a class from a 6-character class code (via SECURITY DEFINER RPC). */
export async function resolveClassInviteCode(code: string) {
  const resolved = await resolveClassByCode(code)
  if (!resolved) {
    throw new Error(INVALID_INVITE_MESSAGE)
  }
  return resolved
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
    p_date_of_birth: normalizeDateOnlyString(child.dateOfBirth),
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

function isDuplicateEnrollmentError(error: { code?: string } | null): boolean {
  return error?.code === '23505'
}

async function linkChildToClass(
  childId: string,
  instructorId: string,
  classId: string,
): Promise<void> {
  const supabase = getSupabaseClient()

  const { data: existing, error: existingError } = await supabase
    .from('child_instructor_relationships')
    .select('id, status')
    .eq('child_id', childId)
    .eq('class_id', classId)
    .maybeSingle()

  if (existingError) throw new Error(formatAppError(existingError))

  if (existing?.status === 'active') {
    return
  }

  if (existing) {
    const { data: updated, error: updateError } = await supabase
      .from('child_instructor_relationships')
      .update({ status: 'active', instructor_id: instructorId })
      .eq('id', existing.id)
      .select('id')

    if (updateError) throw new Error(formatAppError(updateError))
    if (updated && updated.length > 0) return
  }

  const { error: instructorLinkError } = await supabase.from('child_instructor_relationships').insert({
    child_id: childId,
    instructor_id: instructorId,
    class_id: classId,
    status: 'active',
  })

  if (!instructorLinkError) return

  if (isDuplicateEnrollmentError(instructorLinkError)) {
    const { data: enrolled, error: rereadError } = await supabase
      .from('child_instructor_relationships')
      .select('id')
      .eq('child_id', childId)
      .eq('class_id', classId)
      .maybeSingle()

    if (rereadError) throw new Error(formatAppError(rereadError))
    if (enrolled) return
    throw new Error(DUPLICATE_CLASS_ENROLLMENT_MESSAGE)
  }

  throw new Error(formatAppError(instructorLinkError))
}

/**
 * Enrolls a parent's swimmer in a class.
 * Class code is validated via RPC before any new child row is inserted.
 */
export async function enrollChildInClass(input: EnrollChildInput): Promise<EnrollChildResult> {
  await assertParentEnrollmentSession(input.parentUserId)

  const resolved = await resolveClassInviteCode(input.classCode)
  const target = resolveChildTarget(input)

  let childId: string
  if (target === 'existing') {
    childId = input.childId!.trim()
    await verifyParentOwnsChild(input.parentUserId, childId)
  } else {
    childId = await createChildForParent(input.child!)
  }

  await linkChildToClass(childId, resolved.instructorId, resolved.classId)

  return {
    childId,
    instructorId: resolved.instructorId,
    instructorName: resolved.instructorName,
    classId: resolved.classId,
    classLabel: resolved.className,
    location: resolved.location,
    scheduleDetails: resolved.scheduleDetails,
  }
}
