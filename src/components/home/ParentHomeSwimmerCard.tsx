import {
  ageFromDateOfBirth,
  formatDateOfBirth,
  type SwimmerClassEnrollment,
  type SwimmerRosterEntry,
} from '../../lib/swimmers'
import { accentForClass } from '../../lib/classAccent'
import { Badge, Button, MaterialIcon } from '../ui'
import { ClassContextBanner, ClassDetailRows } from './ClassContextBanner'

interface ParentHomeSwimmerCardProps {
  swimmer: SwimmerRosterEntry
  onEnroll?: () => void
  onEdit?: () => void
}

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

function ClassEnrollmentBanner({
  enrollment,
  index,
}: {
  enrollment: SwimmerClassEnrollment
  index: number
}) {
  const accent = accentForClass(enrollment.classId, index)
  const schedule = enrollment.scheduleDetails?.trim() || 'Schedule not set'
  const location = enrollment.location?.trim() || 'Location not set'
  const instructor = enrollment.instructorName?.trim() || 'Instructor'

  return (
    <ClassContextBanner
      accent={accent}
      title={enrollment.className ?? 'Class'}
      pill="Class"
      subtitle={`Coach ${instructor}`}
    >
      <ClassDetailRows accent={accent} schedule={schedule} location={location} instructor={instructor} />
    </ClassContextBanner>
  )
}

export function ParentHomeSwimmerCard({ swimmer, onEnroll, onEdit }: ParentHomeSwimmerCardProps) {
  const age = ageFromDateOfBirth(swimmer.dateOfBirth)
  const dobLabel = formatDateOfBirth(swimmer.dateOfBirth)
  const fullName = `${swimmer.firstName} ${swimmer.lastName}`
  const activeEnrollments = swimmer.enrollments.filter(
    (row) => row.status === 'active' && row.classId,
  )

  return (
    <article
      className="flex flex-col gap-4 rounded-3xl bg-surface-container-lowest p-card-padding shadow-[0_4px_16px_-2px_rgba(0,100,124,0.08),0_2px_6px_-1px_rgba(15,23,42,0.04)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary-fixed text-lg font-bold text-on-primary-fixed-variant shadow-sm">
            {initials(swimmer.firstName, swimmer.lastName)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="truncate text-headline-sm text-on-surface">{fullName}</h4>
              {swimmer.enrollmentBadge === 'enrolled' ? (
                <Badge tone="success" size="sm">Enrolled</Badge>
              ) : (
                <Badge tone="warning" size="sm">Not enrolled</Badge>
              )}
            </div>
            <span className="text-body-sm text-on-surface-variant">
              {age != null ? `${age} years old` : 'Age —'}
              {dobLabel ? ` (${dobLabel})` : ''}
            </span>
          </div>
        </div>
      </div>

      {activeEnrollments.length > 0 ? (
        <ul className="flex max-h-[min(28rem,70vh)] flex-col gap-3 overflow-y-auto pr-0.5 [-ms-overflow-style:auto] [scrollbar-width:thin]">
          {activeEnrollments.map((enrollment, index) => (
            <li key={`${enrollment.classId}-${index}`}>
              <ClassEnrollmentBanner enrollment={enrollment} index={index} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-outline-variant/50 bg-surface-container-low p-4 text-center">
          <p className="text-body-sm text-on-surface-variant">
            Not linked to a class yet. Use your instructor&apos;s class code to enroll.
          </p>
          {onEnroll ? (
            <Button type="button" variant="secondary" size="sm" className="mt-3 rounded-full" onClick={onEnroll}>
              Join a class
            </Button>
          ) : null}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="secondary" fullWidth className="h-11 rounded-2xl" onClick={onEdit}>
          <MaterialIcon name="edit" size={18} />
          Edit profile
        </Button>
        <Badge tone="neutral" className="justify-center py-2 sm:w-auto">
          Pool forms — Coming soon
        </Badge>
      </div>
    </article>
  )
}
