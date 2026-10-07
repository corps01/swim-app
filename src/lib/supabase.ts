import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { assertSupabaseEnv, env, getSupabaseUrl } from './env'

export { assertSupabaseEnv, isSupabaseConfigured } from './env'

let client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  assertSupabaseEnv()

  if (!client) {
    client = createClient(getSupabaseUrl(), env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }

  return client
}
