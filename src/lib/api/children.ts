import { normalizeDateOnlyString } from '../dateOnly'
import { formatAppError } from '../errors'
import { getSupabaseClient } from '../supabase'

export interface UpdateChildInput {
  firstName: string
  lastName: string
  dateOfBirth: string
  notes: string
}

export async function updateChildForParent(childId: string, input: UpdateChildInput): Promise<void> {
  const dateOfBirth = normalizeDateOnlyString(input.dateOfBirth)
  if (!dateOfBirth) {
    throw new Error('Date of birth must be a valid YYYY-MM-DD value.')
  }

  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('children')
    .update({
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      date_of_birth: dateOfBirth,
      notes: input.notes.trim() || null,
    })
    .eq('id', childId)

  if (error) throw new Error(formatAppError(error))
}
