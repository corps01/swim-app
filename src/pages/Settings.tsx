import { useState, type FormEvent } from 'react'
import { AppLayout } from '../components/layout'
import { SettingsToggle } from '../components/settings/SettingsToggle'
import { Badge, Button, Card, MaterialIcon, Spinner } from '../components/ui'
import { controlClass } from '../components/ui/styles'
import { useAuth } from '../hooks/useAuth'
import { useNotificationPreferences } from '../hooks/useNotificationPreferences'
import { cn } from '../lib/cn'
import {
  NOTIFY_BEFORE_HOURS_OPTIONS,
  type ReminderFrequency,
} from '../types/settings'

interface SettingsProps {
  onBack: () => void
}

type SettingsTab = 'notifications' | 'general'

const SETTINGS_TABS: Array<{ id: SettingsTab; label: string; icon: string }> = [
  { id: 'notifications', label: 'Notifications', icon: 'notifications' },
  { id: 'general', label: 'General Preferences', icon: 'tune' },
]

/** Placeholder rows for settings that are not wired yet. Add real state here later. */
const FUTURE_SETTINGS: Array<{
  id: string
  icon: string
  title: string
  description: string
  value: string
}> = [
  {
    id: 'theme',
    icon: 'dark_mode',
    title: 'App theme',
    description: 'Light, dark, or match your device.',
    value: 'Light',
  },
  {
    id: 'sound',
    icon: 'volume_up',
    title: 'Sound options',
    description: 'Sounds for reminders and deck actions.',
    value: 'Default',
  },
  {
    id: 'profile',
    icon: 'manage_accounts',
    title: 'Profile management',
    description: 'Name, phone, and account details.',
    value: 'On Account',
  },
]

export function Settings({ onBack }: SettingsProps) {
  const { user } = useAuth()
  const { preferences, loading, saving, error, saved, update, save } =
    useNotificationPreferences(user?.id)
  const [tab, setTab] = useState<SettingsTab>('notifications')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    await save()
  }

  return (
    <AppLayout
      title="Settings"
      subtitle={user?.role === 'instructor' ? 'Instructor account' : 'Parent account'}
      onBack={onBack}
      backLabel="← Back"
    >
      <div className="flex flex-col gap-4 pb-10">
        <div
          role="tablist"
          aria-label="Settings sections"
          className="grid grid-cols-2 gap-1 rounded-full bg-surface-container-low p-1"
        >
          {SETTINGS_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                'flex min-h-11 items-center justify-center gap-1.5 rounded-full px-2 text-label-md',
                tab === item.id
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-on-surface-variant',
              )}
            >
              <MaterialIcon name={item.icon} size={18} />
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>

        {tab === 'general' ? (
          <section aria-label="General Preferences" className="flex flex-col gap-3">
            <Card variant="outline" className="gap-1 rounded-3xl">
              <h2 className="text-headline-sm text-on-surface">General Preferences</h2>
              <p className="text-body-sm text-on-surface-variant">
                More options will live here as they are added.
              </p>
            </Card>
            {FUTURE_SETTINGS.map((item) => (
              <Card key={item.id} variant="outline" className="gap-0 rounded-3xl opacity-70">
                <div className="flex min-h-11 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-container text-primary">
                    <MaterialIcon name={item.icon} size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-label-lg text-on-surface">{item.title}</span>
                    <span className="block text-body-sm text-on-surface-variant">{item.description}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-label-md text-on-surface-variant">{item.value}</span>
                    <Badge tone="neutral">Coming soon</Badge>
                  </span>
                </div>
              </Card>
            ))}
          </section>
        ) : loading || !preferences ? (
          <Spinner label="Loading settings…" />
        ) : (
          <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
            <section aria-label="Notifications" className="flex flex-col gap-4">
              <Card variant="outline" className="gap-3 rounded-3xl">
                <div>
                  <h2 className="text-headline-sm text-on-surface">Class reminders</h2>
                  <p className="text-body-sm text-on-surface-variant">
                    How long before class we should remind you.
                  </p>
                </div>
                <fieldset>
                  <legend className="sr-only">Remind me before class</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {NOTIFY_BEFORE_HOURS_OPTIONS.map((option) => {
                      const selected = preferences.notifyBeforeHours === option.value
                      return (
                        <label
                          key={option.value}
                          className={cn(
                            'flex min-h-14 cursor-pointer items-center gap-2 rounded-2xl border px-3',
                            selected
                              ? 'border-primary bg-primary-fixed/30'
                              : 'border-outline-variant/40 bg-surface-container-lowest',
                          )}
                        >
                          <input
                            type="radio"
                            name="notify-before-hours"
                            value={option.value}
                            checked={selected}
                            onChange={() => update({ notifyBeforeHours: option.value })}
                            className="size-5 shrink-0 accent-primary"
                          />
                          <span className="text-label-lg text-on-surface">
                            {option.label}
                            {option.value === 2 ? (
                              <span className="block text-label-sm font-semibold text-on-surface-variant">
                                Default
                              </span>
                            ) : null}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>

                <label className="flex flex-col gap-1 text-label-md text-on-surface">
                  Reminder frequency
                  <select
                    value={preferences.reminderFrequency}
                    onChange={(event) =>
                      update({ reminderFrequency: event.target.value as ReminderFrequency })
                    }
                    className={controlClass}
                  >
                    <option value="per_class">For each class</option>
                    <option value="daily_digest">Daily digest</option>
                  </select>
                </label>
              </Card>

              <Card variant="outline" className="gap-4 rounded-3xl">
                <SettingsToggle
                  title="Push reminders"
                  description="Class reminders on this device."
                  icon="notifications_active"
                  checked={preferences.pushNotificationsEnabled}
                  onChange={(checked) => update({ pushNotificationsEnabled: checked })}
                />
                <SettingsToggle
                  title="Daily agenda summary"
                  description={
                    user?.role === 'instructor'
                      ? 'A morning summary of today’s classes.'
                      : 'A morning summary of today’s classes for your swimmers.'
                  }
                  icon="today"
                  checked={preferences.dailyAgendaSummaryEnabled}
                  onChange={(checked) => update({ dailyAgendaSummaryEnabled: checked })}
                />
              </Card>
            </section>

            {error ? (
              <p role="alert" className="text-body-sm text-error">
                {error}
              </p>
            ) : null}
            {saved ? (
              <p role="status" className="flex items-center gap-1.5 text-label-md text-on-secondary-container">
                <MaterialIcon name="check_circle" size={18} filled />
                Settings saved.
              </p>
            ) : null}

            <Button type="submit" fullWidth className="h-14 rounded-full" disabled={saving}>
              {saving ? 'Saving…' : 'Save settings'}
            </Button>
          </form>
        )}
      </div>
    </AppLayout>
  )
}
