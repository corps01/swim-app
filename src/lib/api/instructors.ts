import { formatAppError } from '../errors'
import { getSupabaseClient } from '../supabase'

export const PLACEHOLDER_CLASS_LABEL = 'Swim class'

export interface InstructorOption {
  id: string
  code: string
  name: string
  classLabel: string
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value: string) {
  return UUID_PATTERN.test(value)
}

/**
 * Resolves an instructor from the invite value shared by the coach (their profile UUID).
 */
export async function lookupInstructorByCode(rawCode: string): Promise<InstructorOption | null> {
  const code = rawCode.trim()
  if (!code) return null
  if (!isUuid(code)) return null

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', code)
    .eq('role', 'instructor')
    .maybeSingle()

  if (error) throw new Error(formatAppError(error))
  if (!data) return null

  return {
    id: data.id,
    code,
    name: data.full_name,
    classLabel: PLACEHOLDER_CLASS_LABEL,
  }
}
