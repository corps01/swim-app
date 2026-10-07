import { formatAppError } from '../errors'
import { fetchProfile } from './profile'
import { getSupabaseClient } from '../supabase'

/** Ensures the Supabase JWT matches the UI parent and profiles.role is parent (RLS uses auth.uid()). */
export async function assertParentEnrollmentSession(expectedParentId: string): Promise<void> {
  const supabase = getSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) throw new Error(formatAppError(authError))

  if (!user) {
    throw new Error('Sign in with your parent account to enroll a swimmer.')
  }

  if (user.id !== expectedParentId) {
    throw new Error('Your session does not match this account. Sign out, then sign in again.')
  }

  const profile = await fetchProfile(user.id)
  if (!profile) {
    throw new Error('Your account profile is missing. Sign out and sign in again, or contact support.')
  }

  if (profile.role !== 'parent') {
    throw new Error('Only parent accounts can join a class. Sign in with a parent account.')
  }
}
