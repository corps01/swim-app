import { BadgeCheck } from 'lucide-react'
import { Button, Card } from '../ui'
import type { ChildEnrollmentDraft } from '../../types/enrollment'
import type { InstructorOption } from '../../lib/api/instructors'

interface EnrollmentSuccessStepProps {
  child: ChildEnrollmentDraft
  instructor: InstructorOption
  onEnrollAnother: () => void
  onGoHome: () => void
}

export function EnrollmentSuccessStep({
  child,
  instructor,
  onEnrollAnother,
  onGoHome,
}: EnrollmentSuccessStepProps) {
  return (
    <div className="flex flex-col gap-4 text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
        <BadgeCheck className="size-8" aria-hidden />
      </div>
      <div>
        <h2 className="text-headline-md text-on-surface">You&apos;re all set</h2>
        <p className="mt-1 text-body-md text-on-surface-variant">
          {child.firstName} is linked to {instructor.name}&apos;s class. You&apos;ll get pre-session
          forms from this instructor before class.
        </p>
      </div>

      <Card variant="outline" className="text-left">
        <p className="text-label-md text-on-surface">{instructor.classLabel}</p>
        <p className="text-body-sm text-on-surface-variant">Code {instructor.code}</p>
      </Card>

      <Button fullWidth onClick={onGoHome}>Back to home</Button>
      <Button variant="secondary" fullWidth onClick={onEnrollAnother}>
        Enroll another swimmer
      </Button>
    </div>
  )
}
