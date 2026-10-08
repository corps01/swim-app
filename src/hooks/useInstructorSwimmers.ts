import { useCallback, useEffect, useState } from 'react'
import { fetchInstructorSwimmers, type InstructorSwimmerEntry } from '../lib/api/instructorSwimmers'
import { formatAppError } from '../lib/errors'
import { useAuth } from './useAuth'

export function useInstructorSwimmers(classId?: string) {
  const { signedIn, isInstructor } = useAuth()
  const [swimmers, setSwimmers] = useState<InstructorSwimmerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const canLoad = signedIn && isInstructor

  const refresh = useCallback(async () => {
    if (!canLoad) {
      setSwimmers([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const rows = await fetchInstructorSwimmers(classId)
      setSwimmers(rows)
      setError(null)
    } catch (err) {
      const message = formatAppError(err)
      setError(message)
      setSwimmers([])
    } finally {
      setLoading(false)
    }
  }, [canLoad, classId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { swimmers, loading, error, refresh }
}
