import { useState, type FormEvent } from 'react'
import { AppLayout } from '../components/layout'
import {
  ClassScheduleFormFields,
  scheduleInputFromFormValues,
  type ClassScheduleFormValues,
} from '../components/instructor/ClassScheduleFormFields'
import { useAuth } from '../hooks/useAuth'
import { createInstructorClass } from '../lib/api/classes'
import { validateClassSchedule } from '../lib/classSchedule'
import type { SwimClass } from '../types/class'
import { formatAppError } from '../lib/errors'
import { Button, MaterialIcon } from '../components/ui'

interface InstructorCreateClassPageProps {
  onBack: () => void
  onCreated: (classRow: SwimClass) => void
}

const initialScheduleValues = (): ClassScheduleFormValues => ({
  location: '',
  laneDetail: '',
  daysOfWeek: [],
  startTime: '16:00',
  endTime: '16:45',
  seasonStart: '',
  seasonEnd: '',
})

export function InstructorCreateClassPage({ onBack, onCreated }: InstructorCreateClassPageProps) {
  const { user } = useAuth()
  const instructorId = user?.id

  const [name, setName] = useState('')
  const [scheduleValues, setScheduleValues] = useState(initialScheduleValues)
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

    const schedule = scheduleInputFromFormValues(scheduleValues)
    const scheduleError = validateClassSchedule(schedule)
    if (scheduleError) {
      setError(scheduleError)
      return
    }

    setSubmitting(true)
    try {
      const created = await createInstructorClass(instructorId, {
        name,
        location: scheduleValues.location || null,
        schedule,
      })
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
      subtitle="Name, pool, and weekly session times"
      onBack={onBack}
      variant="flow"
    >
      <form className="flex flex-col gap-4 pb-8" onSubmit={(event) => void handleSubmit(event)}>
        <p className="text-body-sm text-on-surface-variant">
          SplashPass generates a unique 6-character class code.{' '}
          <strong className="font-semibold text-on-surface">Weekly session days and times are required</strong>{' '}
          so this class appears on your <strong className="font-semibold text-on-surface">Today</strong> agenda.
        </p>

        <ClassScheduleFormFields
          showName
          name={name}
          onNameChange={setName}
          values={scheduleValues}
          onChange={(patch) => setScheduleValues((current) => ({ ...current, ...patch }))}
        />

        {error ? <p className="text-body-sm text-error">{error}</p> : null}

        <Button
          type="submit"
          fullWidth
          className="mt-2 h-12 rounded-2xl"
          disabled={
            submitting ||
            scheduleValues.daysOfWeek.length === 0 ||
            !scheduleValues.startTime ||
            !scheduleValues.endTime
          }
        >
          {submitting ? 'Creating…' : 'Create class & share'}
          <MaterialIcon name="check" size={18} />
        </Button>
      </form>
    </AppLayout>
  )
}
