import { formatSeasonRangeLabel } from '../../lib/classSchedule'
import {
  ageFromDateOfBirth,
  formatDateOfBirth,
  type SwimmerClassEnrollment,
  type SwimmerRosterEntry,
} from '../../lib/swimmers'
import { Badge, Button, MaterialIcon, ProfileAvatar } from '../ui'

interface ParentHomeSwimmerCardProps {
  swimmer: SwimmerRosterEntry
  onEnroll?: (childId: string) => void
  onOpenClass?: (classId: string) => void
  onViewActivity?: () => void
}

function CompactClass({
  enrollment,
  onOpen,
}: {
  enrollment: SwimmerClassEnrollment
  onOpen?: () => void
}) {
  const schedule = enrollment.scheduleDetails?.trim() || 'Schedule not set'
  const location = enrollment.location?.trim() || 'Location not set'
  const instructor = enrollment.instructorName?.trim() || 'Coach'
  const season = formatSeasonRangeLabel(enrollment.seasonStart, enrollment.seasonEnd)?.replace(/^Season:\s*/, '')
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Enrolled program</p>
          {onOpen ? (
            <button type="button" onClick={onOpen} className="truncate text-left text-label-lg text-primary">
              {enrollment.className ?? 'Class'}
            </button>
          ) : (
            <h4 className="truncate text-label-lg text-on-surface">{enrollment.className ?? 'Class'}</h4>
          )}
        </div>
        <span className="inline-flex max-w-[45%] shrink-0 items-center gap-1 text-[11px] font-medium text-on-surface-variant">
          <MaterialIcon name="location_on" size={14} />
          <span className="truncate">{location}</span>
        </span>
      </div>
      <p className="truncate text-label-md text-on-surface">
        <span className="text-on-surface-variant">Coach </span>
        {instructor}
      </p>
      <p className="truncate text-label-md text-on-surface">{schedule}</p>
      {season ? <p className="truncate text-[11px] font-medium text-on-surface-variant">{season}</p> : null}
      {enrollment.status === 'pending' ? (
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-amber-800">Pending enrollment</p>
      ) : null}
    </div>
  )
}

export function ParentHomeSwimmerCard({ swimmer, onEnroll, onOpenClass, onViewActivity }: ParentHomeSwimmerCardProps) {
  const age = ageFromDateOfBirth(swimmer.dateOfBirth)
  const born = formatDateOfBirth(swimmer.dateOfBirth)
  const fullName = `${swimmer.firstName} ${swimmer.lastName}`.trim()
  const linked = swimmer.enrollments.filter((row) => row.classId && (row.status === 'active' || row.status === 'pending'))
  const enrolled = linked.some((row) => row.status === 'active')
  const pending = !enrolled && linked.length > 0

  return (
    <article
      id={`swimmer-${swimmer.id}`}
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-[0_12px_28px_-16px_rgba(15,23,42,0.18)]"
    >
      <div className="flex items-start justify-between gap-3 border-b border-outline-variant/20 px-4 py-3.5">
        <button type="button" className="flex min-w-0 items-center gap-3 text-left" onClick={onViewActivity}>
          <ProfileAvatar firstName={swimmer.firstName} lastName={swimmer.lastName} />
          <span className="min-w-0">
            <span className="block truncate text-headline-sm text-on-surface">{fullName}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-body-sm text-on-surface-variant">
              <span>{age != null ? `${age} years old` : 'Age not set'}</span>
              {born ? (
                <span className="inline-flex items-center gap-1">
                  <span aria-hidden>·</span>
                  <MaterialIcon name="cake" size={14} />
                  {born}
                </span>
              ) : null}
            </span>
          </span>
        </button>
        <Badge tone={enrolled ? 'success' : 'warning'}>
          {enrolled ? 'Enrolled' : pending ? 'Pending' : 'Not enrolled'}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 py-3">
        {linked.length > 0 ? (
          linked.map((enrollment, index) => (
            <CompactClass
              key={`${enrollment.classId}-${index}`}
              enrollment={enrollment}
              onOpen={enrollment.classId && onOpenClass ? () => onOpenClass(enrollment.classId!) : undefined}
            />
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-outline-variant/50 bg-surface-container-lowest p-3 text-center">
            <p className="text-body-sm text-on-surface-variant">Not linked to a class yet.</p>
            {onEnroll ? (
              <Button type="button" variant="secondary" size="sm" className="mt-2 rounded-full" onClick={() => onEnroll(swimmer.id)}>
                Join a class
              </Button>
            ) : null}
          </div>
        )}
      </div>

      {onViewActivity ? (
        <div className="border-t border-outline-variant/20 px-4 py-3">
          <Button type="button" fullWidth className="h-11 rounded-xl" onClick={onViewActivity}>
            View swimmer details
            <MaterialIcon name="arrow_forward" size={18} />
          </Button>
        </div>
      ) : null}
    </article>
  )
}
