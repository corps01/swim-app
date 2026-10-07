import { useCallback, useEffect, useState } from 'react'
import { fetchParentSwimmers } from '../lib/api/swimmers'
import type { SwimmerRosterEntry } from '../lib/swimmers'

export function useParentSwimmers(parentId: string | undefined) {
  const [swimmers, setSwimmers] = useState<SwimmerRosterEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!parentId) {
      setSwimmers([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const rows = await fetchParentSwimmers(parentId)
      setSwimmers(rows)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load swimmers.'
      setError(message)
      setSwimmers([])
    } finally {
      setLoading(false)
    }
  }, [parentId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { swimmers, loading, error, refresh }
}
