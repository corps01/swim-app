import { useEffect, useState, type FormEvent } from 'react'
import { AppLayout } from '../../components/layout'
import {
  ClassScheduleFormFields,
  scheduleFormValuesFromInput,
  scheduleInputFromFormValues,
  type ClassScheduleFormValues,
} from '../../components/instructor/ClassScheduleFormFields'
import { useAuth } from '../../hooks/useAuth'
import {
  fetchClassScheduleRules,
  scheduleInputFromRules,
} from '../../lib/api/classSchedule'
import { fetchInstructorClass, updateInstructorClassWithSchedule } from '../../lib/api/classes'
import { validateClassSchedule } from '../../lib/classSchedule'
import { formatAppError } from '../../lib/errors'
import { Button, MaterialIcon } from '../../components/ui'

interface InstructorEditClassPageProps {
  classId: string
  onBack: () => void
  onSaved: () => void
}

export function InstructorEditClassPage({ classId, onBack, onSaved }: InstructorEditClassPageProps) {
  const { user } = useAuth()
  const instructorId = user?.id

  const [name, setName] = useState('')
  const [scheduleValues, setScheduleValues] = useState<ClassScheduleFormValues | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const classRow = await fetchInstructorClass(classId)
        if (!classRow || classRow.instructor_id !== instructorId) {
          throw new Error('Class not found.')
        }
        const rules = await fetchClassScheduleRules(classId)
        const schedule = scheduleInputFromRules(rules)
        if (cancelled) return

        setName(classRow.name)
        if (schedule) {
          setScheduleValues(scheduleFormValuesFromInput(schedule, classRow.location ?? ''))
        } else {
          setScheduleValues({
            location: classRow.location ?? '',
            laneDetail: '',
            daysOfWeek: [],
            startTime: '16:00',
            endTime: '16:45',
            seasonStart: '',
            seasonEnd: '',
          })
        }
      } catch (err) {
        if (!cancelled) setError(formatAppError(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [classId, instructorId])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!instructorId || !scheduleValues) return
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
      await updateInstructorClassWithSchedule(classId, {
        name,
        location: scheduleValues.location || null,
        schedule,
      })
      onSaved()
    } catch (err) {
      setError(formatAppError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppLayout
      title="Edit class"
      subtitle="Update pool and weekly session times"
      onBack={onBack}
      variant="flow"
    >
      {loading ? (
        <p className="text-body-md text-on-surface-variant">Loading class…</p>
      ) : !scheduleValues ? (
        <p className="text-body-md text-error">{error ?? 'Could not load class.'}</p>
      ) : (
        <form className="flex flex-col gap-4 pb-8" onSubmit={(event) => void handleSubmit(event)}>
          <ClassScheduleFormFields
            showName
            name={name}
            onNameChange={setName}
            values={scheduleValues}
            onChange={(patch) =>
              setScheduleValues((current) => (current ? { ...current, ...patch } : current))
            }
          />

          {error ? <p className="text-body-sm text-error">{error}</p> : null}

          <Button type="submit" fullWidth className="mt-2 h-12 rounded-2xl" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save changes'}
            <MaterialIcon name="check" size={18} />
          </Button>
        </form>
      )}
    </AppLayout>
  )
}
