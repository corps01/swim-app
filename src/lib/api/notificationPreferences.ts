import { formatAppError } from '../errors'
import { getSupabaseClient } from '../supabase'
import {
  defaultNotificationPreferences,
  isNotifyBeforeHours,
  type NotificationPreferences,
} from '../../types/settings'

const MIGRATION_HINT =
  'Run docs/sql/08-notification-preferences.sql in the Supabase SQL Editor, then try again.'

function settingsError(error: unknown): Error {
  const message = formatAppError(error)
  return new Error(message.includes('notification_preferences') ? `${message} ${MIGRATION_HINT}` : message)
}

function parsePreferences(userId: string, row: Record<string, unknown>): NotificationPreferences {
  const defaults = defaultNotificationPreferences(userId)
  return {
    userId,
    notifyBeforeHours: isNotifyBeforeHours(row.notify_before_hours)
      ? row.notify_before_hours
      : defaults.notifyBeforeHours,
    pushNotificationsEnabled:
      typeof row.push_notifications_enabled === 'boolean'
        ? row.push_notifications_enabled
        : defaults.pushNotificationsEnabled,
    dailyAgendaSummaryEnabled:
      typeof row.daily_agenda_summary_enabled === 'boolean'
        ? row.daily_agenda_summary_enabled
        : defaults.dailyAgendaSummaryEnabled,
    reminderFrequency: row.reminder_frequency === 'daily_digest' ? 'daily_digest' : 'per_class',
  }
}

/** Returns the saved row, or defaults when the account has no row yet. */
export async function fetchNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('notification_preferences')
    .select(
      'user_id, notify_before_hours, push_notifications_enabled, daily_agenda_summary_enabled, reminder_frequency',
    )
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw settingsError(error)
  if (!data) return defaultNotificationPreferences(userId)
  return parsePreferences(userId, data as Record<string, unknown>)
}

export async function saveNotificationPreferences(
  preferences: NotificationPreferences,
): Promise<NotificationPreferences> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert(
      {
        user_id: preferences.userId,
        notify_before_hours: preferences.notifyBeforeHours,
        push_notifications_enabled: preferences.pushNotificationsEnabled,
        daily_agenda_summary_enabled: preferences.dailyAgendaSummaryEnabled,
        reminder_frequency: preferences.reminderFrequency,
      },
      { onConflict: 'user_id' },
    )
    .select(
      'user_id, notify_before_hours, push_notifications_enabled, daily_agenda_summary_enabled, reminder_frequency',
    )
    .single()

  if (error) throw settingsError(error)
  return parsePreferences(preferences.userId, data as Record<string, unknown>)
}
