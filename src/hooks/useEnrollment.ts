import { useCallback, useState } from 'react'
import { enrollChildInClass } from '../lib/api/enrollment'
import { formatAppError } from '../lib/errors'
import type { EnrollChildInput, EnrollChildResult } from '../types/enrollment'

export function useEnrollment() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitEnrollment = useCallback(
    async (input: EnrollChildInput): Promise<EnrollChildResult | null> => {
      setSubmitting(true)
      setError(null)
      try {
        return await enrollChildInClass(input)
      } catch (err) {
        setError(formatAppError(err))
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
