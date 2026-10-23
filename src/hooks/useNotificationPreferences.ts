import { useCallback, useEffect, useState } from 'react'
import {
  fetchNotificationPreferences,
  saveNotificationPreferences,
} from '../lib/api/notificationPreferences'
import { formatAppError } from '../lib/errors'
import {
  defaultNotificationPreferences,
  type NotificationPreferences,
} from '../types/settings'

export function useNotificationPreferences(userId: string | undefined) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!userId) {
      setPreferences(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    setSaved(false)
    void fetchNotificationPreferences(userId)
      .then((next) => {
        if (!cancelled) setPreferences(next)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setPreferences(defaultNotificationPreferences(userId))
          setError(formatAppError(err))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  const update = useCallback((patch: Partial<Omit<NotificationPreferences, 'userId'>>) => {
    setSaved(false)
    setPreferences((current) => (current ? { ...current, ...patch } : current))
  }, [])

  const save = useCallback(async () => {
    if (!preferences || saving) return
    setSaving(true)
    setError(null)
    try {
      const next = await saveNotificationPreferences(preferences)
      setPreferences(next)
      setSaved(true)
    } catch (err) {
      setError(formatAppError(err))
    } finally {
      setSaving(false)
    }
  }, [preferences, saving])

  return { preferences, loading, saving, error, saved, update, save }
}
