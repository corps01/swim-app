import type { UserRole } from '../types/database'
import { fetchProfile, upsertProfile } from './api/profile'
import { formatAppError } from './errors'
import { getSupabaseClient } from './supabase'

export interface AuthUser {
  id: string
  fullName: string
  role: UserRole
}

function roleFromMetadata(metadata: Record<string, unknown> | undefined): UserRole {
  return metadata?.role === 'instructor' ? 'instructor' : 'parent'
}

async function mapAuthUser(userId: string): Promise<AuthUser | null> {
  const profile = await fetchProfile(userId)
  if (!profile) return null

  return {
    id: profile.id,
    fullName: profile.full_name,
    role: profile.role,
  }
}

async function ensureProfile(
  userId: string,
  fullName: string,
  role: UserRole,
): Promise<AuthUser> {
  await upsertProfile(userId, fullName, role)
  const mapped = await mapAuthUser(userId)
  if (mapped) return mapped
  throw new Error('Profile was saved but could not be read back. Check profiles SELECT policies.')
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = getSupabaseClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) throw error
  if (!user) return null

  const existing = await mapAuthUser(user.id)
  if (existing) return existing

  const role = roleFromMetadata(user.user_metadata)
  const metaName = String(user.user_metadata?.full_name ?? '').trim()
  const emailLocal = user.email?.split('@')[0]?.trim() ?? ''
  const fallbackName = role === 'instructor' ? 'Instructor' : 'Parent'
  const fullName = metaName || emailLocal || fallbackName

  try {
    return await ensureProfile(user.id, fullName, role)
  } catch (err) {
    throw new Error(formatAppError(err))
  }
}

export async function signIn(email: string, password: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })
  if (error) throw error
}

export async function signUp(
  fullName: string,
  email: string,
  password: string,
  role: UserRole = 'parent',
): Promise<void> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name: fullName,
        role,
      },
    },
  })
  if (error) throw error

  if (data.session && data.user) {
    try {
      await upsertProfile(data.user.id, fullName, role)
    } catch (err) {
      throw new Error(formatAppError(err))
    }
  }
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export function subscribeToAuthChanges(onChange: () => void): () => void {
  const supabase = getSupabaseClient()
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(() => onChange())
  return () => subscription.unsubscribe()
}
