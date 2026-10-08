const PLACEHOLDER_KEY = 'your-anon-key'

function read(key: keyof ImportMetaEnv): string {
  return import.meta.env[key]?.trim() ?? ''
}

export const env = {
  supabaseUrl: read('SUPABASE_URL'),
  supabaseAnonKey: read('SUPABASE_ANON_KEY'),
  publicAppUrl: read('VITE_PUBLIC_APP_URL'),
} as const

/** Canonical app origin for invite links / QR (falls back to current browser origin). */
export function publicAppOrigin(): string {
  const configured = env.publicAppUrl.replace(/\/$/, '')
  if (configured) return configured
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return ''
}

export function assertSupabaseEnv(): void {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env.',
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
