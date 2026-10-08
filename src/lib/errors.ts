type SupabaseLikeError = {
  message?: string
  hint?: string
  details?: string
  code?: string
}

export function throwIfSupabaseError(error: unknown): void {
  if (error) {
    throw new Error(formatAppError(error))
  }
}

export function formatAppError(err: unknown): string {
  if (typeof err === 'string' && err.trim()) return err.trim()

  if (err instanceof Error && err.message.trim()) {
    return enrichMessage(err.message, err as SupabaseLikeError)
  }

  if (err && typeof err === 'object') {
    const e = err as SupabaseLikeError
    const parts = [e.message, e.hint, e.details].filter(
      (part): part is string => typeof part === 'string' && part.trim().length > 0,
    )
    if (parts.length > 0) {
      return enrichMessage(parts.join(' — '), e)
    }
  }

  return 'Something went wrong. Please try again.'
}

function enrichMessage(message: string, err: SupabaseLikeError): string {
  const lower = message.toLowerCase()
  if (
    err.code === '42501' ||
    lower.includes('permission denied') ||
    lower.includes('row-level security') ||
    lower.includes('row level security')
  ) {
    return `${message} Run docs/sql/01-core-rls.sql in Supabase SQL Editor (profiles policies + GRANTs), then sign in again.`
  }
  return message
}
