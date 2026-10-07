const PLACEHOLDER_KEY = 'your-anon-key'

function read(key: keyof ImportMetaEnv): string {
  return import.meta.env[key]?.trim() ?? ''
}

export const env = {
  supabaseUrl: read('VITE_SUPABASE_URL'),
  supabaseAnonKey: read('VITE_SUPABASE_ANON_KEY'),
} as const

export function assertSupabaseEnv(): void {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.',
    )
  }
}

function normalizeSupabaseUrl(url: string): string {
  return url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
}

export function getSupabaseUrl(): string {
  return normalizeSupabaseUrl(env.supabaseUrl)
}

export function isSupabaseConfigured(): boolean {
  const supabaseUrl = getSupabaseUrl()
  const { supabaseAnonKey } = env
  if (!supabaseUrl || !supabaseAnonKey) return false
  if (supabaseUrl.includes('your-project')) return false
  if (supabaseAnonKey === PLACEHOLDER_KEY) return false
  if (supabaseUrl === 'https://example.supabase.co') return false
  return true
}
