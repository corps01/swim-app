import { useCallback, useState } from 'react'
import { enrollChild } from '../lib/api/enrollment'
import type { EnrollChildInput, EnrollChildResult } from '../types/enrollment'

export function useEnrollment() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitEnrollment = useCallback(
    async (input: EnrollChildInput): Promise<EnrollChildResult | null> => {
      setSubmitting(true)
      setError(null)
      try {
        const result = await enrollChild(input)
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Enrollment failed.'
        setError(message)
        return null
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
