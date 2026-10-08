import { useCallback, useEffect, useState } from 'react'
import { fetchInstructorRoster, type InstructorRosterEntry } from '../lib/api/instructorRoster'
import { formatAppError } from '../lib/errors'
import { useAuth } from './useAuth'

export function useInstructorRoster(classId?: string) {
  const { signedIn, isInstructor } = useAuth()
  const [roster, setRoster] = useState<InstructorRosterEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const canLoad = signedIn && isInstructor

  const refresh = useCallback(async () => {
    if (!canLoad) {
      setRoster([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const rows = await fetchInstructorRoster(classId)
      setRoster(rows)
      setError(null)
    } catch (err) {
      const message = formatAppError(err)
      setError(message)
      setRoster([])
    } finally {
      setLoading(false)
    }
  }, [canLoad, classId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { roster, loading, error, refresh }
}
