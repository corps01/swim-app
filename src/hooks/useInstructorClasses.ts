import { useCallback, useEffect, useState } from 'react'
import { fetchInstructorClasses } from '../lib/api/classes'
import type { SwimClass } from '../types/class'
import { formatAppError } from '../lib/errors'

export function useInstructorClasses(instructorId: string | undefined) {
  const [classes, setClasses] = useState<SwimClass[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!instructorId) {
      setClasses([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const rows = await fetchInstructorClasses(instructorId)
      setClasses(rows)
      setError(null)
    } catch (err) {
      setError(formatAppError(err))
      setClasses([])
    } finally {
      setLoading(false)
    }
  }, [instructorId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { classes, loading, error, refresh }
}
