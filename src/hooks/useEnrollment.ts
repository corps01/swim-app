import { useCallback, useState } from 'react'
import { enrollChildInClass } from '../lib/api/enrollment'
import { formatAppError } from '../lib/errors'
import type { EnrollChildInput, EnrollChildResult } from '../types/enrollment'

export function useEnrollment() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitEnrollment = useCallback(
    async (
      input: EnrollChildInput,
    ): Promise<{ result: EnrollChildResult } | { error: string }> => {
      setSubmitting(true)
      setError(null)
      try {
        const result = await enrollChildInClass(input)
        return { result }
      } catch (err) {
        const message = formatAppError(err)
        setError(message)
        return { error: message }
      } finally {
        setSubmitting(false)
      }
    },
    [],
  )

  return {
    submitting,
    error,
    submitEnrollment,
    clearError: () => setError(null),
  }
}
