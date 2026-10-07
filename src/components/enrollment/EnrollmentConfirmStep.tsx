import { Button, Card } from '../ui'
import type { ChildEnrollmentDraft } from '../../types/enrollment'
import type { InstructorOption } from '../../lib/api/instructors'
import { StepHeader } from './StepHeader'

function formatDate(isoDate: string) {
  if (!isoDate) return '—'
  const date = new Date(`${isoDate}T12:00:00`)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

interface EnrollmentConfirmStepProps {
  child: ChildEnrollmentDraft
  instructor: InstructorOption
  submitting: boolean
  error: string | null
  onBack: () => void
  onSubmit: () => void
}

export function EnrollmentConfirmStep({
  child,
  instructor,
  submitting,
  error,
  onBack,
  onSubmit,
}: EnrollmentConfirmStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <StepHeader
        step={3}
        total={3}
        title="Review and confirm"
        description="Check the details before we link your swimmer to this class."
      />

      <Card>
        <section>
          <h3 className="text-label-md text-on-surface-variant">Swimmer</h3>
          <p className="mt-1 text-label-lg text-on-surface">
            {child.firstName} {child.lastName}
          </p>
          <p className="text-body-md text-on-surface-variant">
            Born {formatDate(child.dateOfBirth)}
          </p>
          {child.notes.trim() ? (
            <p className="mt-2 text-body-sm text-on-surface-variant">{child.notes}</p>
          ) : null}
        </section>

        <section className="border-t border-outline-variant/30 pt-4">
          <h3 className="text-label-md text-on-surface-variant">Class</h3>
          <p className="mt-1 text-label-lg text-on-surface">{instructor.name}</p>
          <p className="text-body-md text-on-surface-variant">{instructor.classLabel}</p>
          <p className="text-label-sm text-primary">{instructor.code}</p>
        </section>
      </Card>

      {error ? (
        <p role="alert" className="rounded bg-error-container px-3 py-2 text-body-sm text-on-error-container">
          {error}
        </p>
      ) : null}

      <div className="flex gap-3">
        <Button type="button" variant="secondary" className="flex-1" onClick={onBack} disabled={submitting}>
          Back
        </Button>
        <Button type="button" className="flex-1" disabled={submitting} onClick={onSubmit}>
          {submitting ? 'Submitting…' : 'Confirm enrollment'}
        </Button>
      </div>
    </div>
  )
}
