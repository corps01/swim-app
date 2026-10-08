import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AppLayout } from '../../components/layout'
import { useAuth } from '../../hooks/useAuth'
import { useParentSwimmers } from '../../hooks/useParentSwimmers'
import { updateChildForParent } from '../../lib/api/children'
import { normalizeDateOnlyString } from '../../lib/dateOnly'
import { formatAppError } from '../../lib/errors'
import {
  ageFromDateOfBirth,
  formatDateOfBirth,
  swimmerHasActiveClass,
  type SwimmerClassEnrollment,
  type SwimmerRosterEntry,
} from '../../lib/swimmers'
import { Badge, Button, Input, MaterialIcon } from '../../components/ui'

const NOTES_MAX = 300

interface EditSwimmerPageProps {
  childId: string
  onBack: () => void
  onSaved: () => void
  onSignOut: () => void
}

interface FormFields {
  firstName: string
  lastName: string
  dateOfBirth: string
  notes: string
}

function formFieldsFromSwimmer(swimmer: SwimmerRosterEntry): FormFields {
  return {
    firstName: swimmer.firstName,
    lastName: swimmer.lastName,
    dateOfBirth: normalizeDateOnlyString(swimmer.dateOfBirth),
    notes: swimmer.notes,
  }
}

const EMPTY_FORM: FormFields = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  notes: '',
}

function EnrollmentSummary({ enrollments }: { enrollments: SwimmerClassEnrollment[] }) {
  const active = enrollments.filter((row) => row.status === 'active' && row.classId)
  if (active.length === 0) {
    return (
      <p className="text-body-sm text-on-surface-variant">
        Not enrolled in a class. Join with your instructor&apos;s class code from the home screen.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {active.map((row) => (
        <li key={row.classId} className="text-body-sm text-on-surface-variant">
          <p className="font-semibold text-on-surface">{row.className ?? 'Class'}</p>
          <p>Instructor: {row.instructorName ?? '—'}</p>
          <p>{row.scheduleDetails?.trim() || 'Schedule not set'}</p>
        </li>
      ))}
    </ul>
  )
}

export function EditSwimmerPage({ childId, onBack, onSaved, onSignOut }: EditSwimmerPageProps) {
  const { user } = useAuth()
  const { swimmers, loading, refresh } = useParentSwimmers(user?.id)

  const swimmer = useMemo(() => swimmers.find((row) => row.id === childId), [swimmers, childId])

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [notes, setNotes] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [discardOpen, setDiscardOpen] = useState(false)

  const applyFormFields = useCallback((fields: FormFields) => {
    setFirstName(fields.firstName)
    setLastName(fields.lastName)
    setDateOfBirth(fields.dateOfBirth)
    setNotes(fields.notes)
    setDirty(false)
    setError(null)
  }, [])

  const resetFormFromSwimmer = useCallback(
    (source: SwimmerRosterEntry) => {
      applyFormFields(formFieldsFromSwimmer(source))
    },
    [applyFormFields],
  )

  useEffect(() => {
    if (!swimmer) {
      applyFormFields(EMPTY_FORM)
      return
    }
    resetFormFromSwimmer(swimmer)
  }, [swimmer, childId, resetFormFromSwimmer, applyFormFields])

  const age = ageFromDateOfBirth(dateOfBirth)
  const notesCount = notes.length

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const normalizedDob = normalizeDateOnlyString(dateOfBirth)
    if (!firstName.trim() || !lastName.trim() || !normalizedDob) {
      setError('First name, last name, and a valid date of birth are required.')
      return
    }

    setSaving(true)
    try {
      await updateChildForParent(childId, {
        firstName,
        lastName,
        dateOfBirth: normalizedDob,
        notes: notes.slice(0, NOTES_MAX),
      })
      await refresh()
      setDirty(false)
      setToast('Profile saved.')
      onSaved()
    } catch (err) {
      setError(formatAppError(err))
    } finally {
      setSaving(false)
    }
  }

  function leaveEditor() {
    if (swimmer) {
      resetFormFromSwimmer(swimmer)
    } else {
      applyFormFields(EMPTY_FORM)
    }
    setDiscardOpen(false)
    onBack()
  }

  function requestBack() {
    if (dirty) {
      setDiscardOpen(true)
      return
    }
    leaveEditor()
  }

  if (loading && !swimmer) {
    return (
      <AppLayout title="Edit swimmer" onBack={onBack} onSignOut={onSignOut} variant="flow">
        <p className="text-body-md text-on-surface-variant">Loading profile…</p>
      </AppLayout>
    )
  }

  if (!swimmer) {
    return (
      <AppLayout title="Edit swimmer" onBack={onBack} onSignOut={onSignOut} variant="flow">
        <p className="text-body-md text-on-surface-variant">Swimmer not found on your account.</p>
        <Button type="button" className="mt-4" onClick={onBack}>Back to home</Button>
      </AppLayout>
    )
  }

  const displayName = `${swimmer.firstName} ${swimmer.lastName}`

  return (
    <AppLayout title="Edit swimmer profile" subtitle={displayName} onBack={requestBack} onSignOut={onSignOut} variant="flow">
      <div className="flex flex-col gap-stack-loose pb-8">
        {dirty ? (
          <div className="flex items-center justify-between rounded-2xl bg-amber-500/10 px-3.5 py-3">
            <p className="flex items-center gap-2 text-label-md text-on-surface">
              <span className="size-2.5 animate-pulse rounded-full bg-amber-500" aria-hidden />
              Unsaved changes
            </p>
            <button
              type="button"
              className="text-label-sm font-bold text-tertiary"
              onClick={() => setDiscardOpen(true)}
            >
              Discard
            </button>
          </div>
        ) : null}

        <div className="flex flex-col items-center rounded-3xl bg-surface-container-lowest p-stack-base text-center shadow-[0_4px_16px_-2px_rgba(8,145,178,0.08)]">
          <div className="relative mb-3">
            <div className="flex size-24 items-center justify-center rounded-full bg-primary-fixed text-headline-md font-bold text-on-primary-fixed-variant">
              {swimmer.firstName.charAt(0)}{swimmer.lastName.charAt(0)}
            </div>
            <Badge tone="neutral" className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap">
              Photo — Coming soon
            </Badge>
          </div>
          <h2 className="text-headline-md text-on-surface">{displayName}</h2>
          <p className="text-body-sm text-on-surface-variant">
            {swimmerHasActiveClass(swimmer) ? 'Enrolled in class' : 'Not enrolled in a class'}
          </p>
        </div>

        <form className="flex flex-col gap-stack-loose" onSubmit={(event) => void handleSave(event)}>
          <section className="flex flex-col gap-4 rounded-3xl bg-surface-container-lowest p-card-padding shadow-sm">
            <h3 className="flex items-center gap-2 text-headline-sm text-on-surface">
              <MaterialIcon name="badge" size={22} className="text-primary" />
              Personal information
            </h3>
            <Input
              label="First name"
              value={firstName}
              onChange={(event) => {
                setDirty(true)
                setFirstName(event.target.value)
              }}
              required
            />
            <Input
              label="Last name"
              value={lastName}
              onChange={(event) => {
                setDirty(true)
                setLastName(event.target.value)
              }}
              required
            />
            <Input
              label="Date of birth"
              type="date"
              value={dateOfBirth}
              onChange={(event) => {
                setDirty(true)
                setDateOfBirth(normalizeDateOnlyString(event.target.value))
              }}
              required
            />
            {age != null ? (
              <p className="text-body-sm text-on-surface-variant">
                {age} years old · {formatDateOfBirth(dateOfBirth)}
              </p>
            ) : null}

            <div className="rounded-2xl bg-surface-container-high/60 p-3.5">
              <p className="text-label-sm font-bold uppercase tracking-wider text-primary">Enrolled programs</p>
              <div className="mt-2">
                <EnrollmentSummary enrollments={swimmer.enrollments} />
              </div>
              <p className="mt-2 text-body-sm italic text-on-surface-variant">
                To change class or level, contact your instructor.
              </p>
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-3xl bg-surface-container-lowest p-card-padding shadow-sm">
            <h3 className="flex items-center gap-2 text-headline-sm text-on-surface">
              <MaterialIcon name="health_and_safety" size={22} className="text-tertiary" />
              Poolside notes
            </h3>
            <label className="flex flex-col gap-1.5">
              <span className="text-label-md text-on-surface">Medical &amp; equipment notes</span>
              <textarea
                rows={4}
                maxLength={NOTES_MAX}
                value={notes}
                onChange={(event) => {
                  setDirty(true)
                  setNotes(event.target.value)
                }}
                className="resize-none rounded-2xl border border-outline-variant/40 bg-surface p-3 text-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary"
                placeholder="Allergies, goggles, accommodations…"
              />
              <span className="text-label-sm text-on-surface-variant">{notesCount} / {NOTES_MAX} characters</span>
            </label>
          </section>

          {error ? <p className="text-body-sm text-error" role="alert">{error}</p> : null}

          <Button type="submit" fullWidth className="h-14 rounded-full" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          <Button type="button" variant="secondary" fullWidth className="rounded-full" onClick={requestBack}>
            Cancel
          </Button>
        </form>
      </div>

      {discardOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/50 p-margin-screen backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-surface-container-lowest p-card-padding shadow-xl">
            <h4 className="text-center text-headline-sm text-on-surface">Discard unsaved changes?</h4>
            <p className="mt-2 text-center text-body-sm text-on-surface-variant">
              Your edits to this swimmer profile will be lost.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                className="bg-error text-on-error"
                onClick={leaveEditor}
              >
                Discard edits
              </Button>
              <Button type="button" fullWidth onClick={() => setDiscardOpen(false)}>Keep editing</Button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div
          className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-on-surface px-4 py-2 text-label-sm text-surface-container-lowest shadow-lg"
          role="status"
        >
          {toast}
        </div>
      ) : null}
    </AppLayout>
  )
}
