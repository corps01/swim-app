export type NotifyBeforeHours = 1 | 2 | 4 | 24

export type ReminderFrequency = 'per_class' | 'daily_digest'

export interface NotificationPreferences {
  userId: string
  notifyBeforeHours: NotifyBeforeHours
  pushNotificationsEnabled: boolean
  dailyAgendaSummaryEnabled: boolean
  reminderFrequency: ReminderFrequency
}

export const NOTIFY_BEFORE_HOURS_OPTIONS: Array<{ value: NotifyBeforeHours; label: string }> = [
  { value: 1, label: '1 hour' },
  { value: 2, label: '2 hours' },
  { value: 4, label: '4 hours' },
  { value: 24, label: '24 hours' },
]

export const DEFAULT_NOTIFY_BEFORE_HOURS: NotifyBeforeHours = 2

export function defaultNotificationPreferences(userId: string): NotificationPreferences {
  return {
    userId,
    notifyBeforeHours: DEFAULT_NOTIFY_BEFORE_HOURS,
    pushNotificationsEnabled: true,
    dailyAgendaSummaryEnabled: false,
    reminderFrequency: 'per_class',
  }
}

export function isNotifyBeforeHours(value: unknown): value is NotifyBeforeHours {
  return value === 1 || value === 2 || value === 4 || value === 24
}
