import { useCallback, useEffect, useState } from 'react'
import { fetchInstructorRoster, type InstructorRosterEntry } from '../lib/api/instructorRoster'
import { formatAppError } from '../lib/errors'

export function useInstructorRoster(instructorId: string | undefined) {
  const [roster, setRoster] = useState<InstructorRosterEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!instructorId) {
      setRoster([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const rows = await fetchInstructorRoster(instructorId)
      setRoster(rows)
      setError(null)
    } catch (err) {
      const message = formatAppError(err)
      setError(message)
      setRoster([])
    } finally {
      setLoading(false)
    }
  }, [instructorId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { roster, loading, error, refresh }
}
