import { useState, type FormEvent } from 'react'
import { AppLayout } from '../components/layout'
import { useAuth } from '../hooks/useAuth'
import { createInstructorClass } from '../lib/api/classes'
import { LAST_CREATED_CLASS_STORAGE_KEY } from '../lib/appNavigation'
import type { SwimClass } from '../types/class'
import { formatAppError } from '../lib/errors'
import { Button, Input, MaterialIcon } from '../components/ui'

interface InstructorCreateClassPageProps {
  onBack: () => void
  onCreated: (classRow: SwimClass) => void
}

export function InstructorCreateClassPage({ onBack, onCreated }: InstructorCreateClassPageProps) {
  const { user } = useAuth()
  const instructorId = user?.id

  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [scheduleDetails, setScheduleDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!instructorId) return
    if (!name.trim()) {
      setError('Class name is required.')
      return
    }

    setSubmitting(true)
    try {
      const created = await createInstructorClass(instructorId, {
        name,
        location: location || null,
        schedule_details: scheduleDetails || null,
      })
      sessionStorage.setItem(LAST_CREATED_CLASS_STORAGE_KEY, created.id)
      onCreated(created)
    } catch (err) {
      setError(formatAppError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppLayout
      title="New class"
      subtitle="Name, location, and schedule"
      onBack={onBack}
      variant="flow"
    >
      <form className="flex flex-col gap-4 pb-8" onSubmit={(event) => void handleSubmit(event)}>
        <p className="text-body-sm text-on-surface-variant">
          SplashPass generates a unique 6-character class code when you create the class.
        </p>

        <Input
          label="Class name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Tuesday Level 2"
          required
          autoFocus
        />
        <Input
          label="Location (optional)"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Pool or facility"
        />
        <Input
          label="Schedule (optional)"
          value={scheduleDetails}
          onChange={(event) => setScheduleDetails(event.target.value)}
          placeholder="e.g. Tue & Thu 4:00 PM"
        />

        {error ? <p className="text-body-sm text-error">{error}</p> : null}

        <Button type="submit" fullWidth className="mt-2 h-12 rounded-2xl" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create'}
          <MaterialIcon name="check" size={18} />
        </Button>
      </form>
    </AppLayout>
  )
}
