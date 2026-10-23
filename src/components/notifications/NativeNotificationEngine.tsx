import { useEffect, useState } from 'react'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '../../hooks/useAuth'
import { fetchNotificationPreferences } from '../../lib/api/notificationPreferences'
import { startOneSignal } from '../../lib/notifications'
import { fetchUpcomingClassAlarms } from '../../services/classAlarmSchedule'
import {
  listenForForegroundReminders,
  requestLocalNotificationPermissions,
  syncClassReminders,
  type ForegroundReminder,
} from '../../services/localNotifications'

/**
 * Native-only. Schedules on-device class alarms from the signed-in parent's
 * classes and registers this device with OneSignal. Does not render app UI
 * except the foreground reminder banner.
 */
export function NativeNotificationEngine() {
  const { user } = useAuth()
  const userId = user?.id
  const [banner, setBanner] = useState<ForegroundReminder | null>(null)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    void requestLocalNotificationPermissions()
    listenForForegroundReminders(setBanner)
    void startOneSignal(userId)
  }, [userId])

  useEffect(() => {
    if (!banner) return
    const timer = window.setTimeout(() => setBanner(null), 8_000)
    return () => window.clearTimeout(timer)
  }, [banner])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let cancelled = false

    async function sync() {
      if (!userId) {
        await syncClassReminders([], 2)
        return
      }
      const preferences = await fetchNotificationPreferences(userId)
      if (cancelled) return
      if (!preferences.pushNotificationsEnabled || preferences.reminderFrequency !== 'per_class') {
        await syncClassReminders([], preferences.notifyBeforeHours)
        return
      }
      const upcoming = await fetchUpcomingClassAlarms(userId)
      if (cancelled) return
      await syncClassReminders(upcoming, preferences.notifyBeforeHours)
    }

    void sync().catch(() => {
      // A failed refresh keeps the alarms already on the device.
    })

    const listener = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void sync().catch(() => undefined)
    })

    return () => {
      cancelled = true
      void listener.then((handle) => handle.remove())
    }
  }, [userId])

  if (!banner) return null

  return (
    <div
      role="status"
      className="fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-[80] mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest px-4 py-3 shadow-[0_8px_24px_rgba(0,100,124,0.16)]"
    >
      <div className="min-w-0 flex-1">
        <p className="text-label-lg text-on-surface">{banner.title}</p>
        <p className="text-body-sm text-on-surface-variant">{banner.body}</p>
      </div>
      <button
        type="button"
        className="min-h-11 shrink-0 text-label-md text-primary"
        onClick={() => setBanner(null)}
      >
        Dismiss
      </button>
    </div>
  )
}
