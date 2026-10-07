import { ageFromDateOfBirth, formatDateOfBirth, type SwimmerRosterEntry } from '../../lib/swimmers'
import { cn } from '../../lib/cn'
import { Button, MaterialIcon } from '../ui'

interface ParentHomeSwimmerCardProps {
  swimmer: SwimmerRosterEntry
  onEnroll?: () => void
}

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

export function ParentHomeSwimmerCard({ swimmer, onEnroll }: ParentHomeSwimmerCardProps) {
  const age = ageFromDateOfBirth(swimmer.dateOfBirth)
  const dobLabel = formatDateOfBirth(swimmer.dateOfBirth)
  const isActive = swimmer.formStatus === 'completed'
  const fullName = `${swimmer.firstName} ${swimmer.lastName}`
  const hasNotes = swimmer.notes.trim().length > 0
  const progressPct = isActive ? 85 : 40

  return (
    <article
      className="flex flex-col gap-4 rounded-3xl bg-surface-container-lowest p-card-padding shadow-[0_4px_16px_-2px_rgba(0,100,124,0.08),0_2px_6px_-1px_rgba(15,23,42,0.04)]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-2xl bg-primary-fixed shadow-sm">
            <div
              className="flex size-full items-center justify-center text-lg font-bold text-on-primary-fixed-variant"
              aria-hidden
            >
              {initials(swimmer.firstName, swimmer.lastName)}
            </div>
            <div
              className={cn(
                'absolute bottom-0 right-0 size-3.5 rounded-tl-lg',
                isActive ? 'bg-secondary' : 'bg-tertiary-container',
              )}
              aria-hidden
            />
          </div>
          <div className="min-w-0 flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="truncate text-headline-sm text-on-surface">{fullName}</h4>
              {isActive ? (
                <span className="rounded-full bg-secondary-fixed/40 px-2 py-0.5 text-label-sm text-on-secondary-fixed">
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2 py-0.5 text-label-sm text-on-surface">
                  <span className="size-1.5 rounded-full bg-tertiary" aria-hidden />
                  Pending verification
                </span>
              )}
            </div>
            <span className="text-body-sm text-on-surface-variant">
              {age != null ? `${age} years old` : 'Age —'}
              {dobLabel ? ` (${dobLabel})` : ''}
            </span>
          </div>
        </div>
        <div
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-2xl bg-surface-container-low',
            isActive ? 'text-primary' : 'text-outline',
          )}
          aria-hidden
        >
          <MaterialIcon name={isActive ? 'pool' : 'hourglass_top'} size={22} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5 rounded-2xl bg-surface-container-low p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-label-md font-bold text-primary">{swimmer.levelLabel}</span>
          <span className="text-label-sm text-on-surface-variant">{swimmer.classLabel}</span>
        </div>
        <p className="text-body-sm text-on-surface-variant">{swimmer.sessionLabel}</p>
        {isActive ? (
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-container-highest">
            <div className="h-full rounded-full bg-primary" style={{ width: `${progressPct}%` }} />
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-2 rounded-2xl bg-surface p-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-full',
              isActive ? 'bg-primary-fixed/60 text-primary' : 'bg-surface-container-high text-on-surface-variant',
            )}
          >
            <MaterialIcon name="sports" size={20} />
          </div>
          <div className="min-w-0">
            <span className="text-label-sm leading-tight text-on-surface-variant">Instructor</span>
            <p className="truncate text-label-md text-on-surface">
              {isActive ? swimmer.instructorName : `${swimmer.instructorName} • Awaiting deck check`}
            </p>
          </div>
        </div>
        {!isActive ? (
          <span className="shrink-0 rounded-full bg-surface-container px-2.5 py-1 text-label-sm text-on-surface-variant">
            Queued
          </span>
        ) : null}
      </div>

      {hasNotes ? (
        <div className="flex items-center gap-2 rounded-2xl bg-error-container/40 px-3 py-2 text-on-error-container">
          <MaterialIcon name="warning" size={18} className="shrink-0 text-tertiary" />
          <span className="truncate text-label-sm">{swimmer.notes}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-2xl bg-surface-container-low px-3 py-2 text-on-surface-variant">
          <MaterialIcon name="check_circle" size={18} className="shrink-0 text-secondary" />
          <span className="text-label-sm">None reported • Standard pool safety clearance</span>
        </div>
      )}

      <div className="flex flex-col gap-2 pt-1">
        <div className="flex items-center gap-1.5 text-body-sm text-on-surface-variant">
          <MaterialIcon name={isActive ? 'schedule' : 'event_available'} size={18} className="text-primary" />
          <span>
            Next class:{' '}
            <strong className="font-semibold text-on-surface">{swimmer.sessionLabel}</strong>
            {' • '}
            {swimmer.classLabel}
          </span>
        </div>
        {isActive ? (
          <Button
            type="button"
            variant="secondary"
            fullWidth
            className="h-11 rounded-2xl bg-primary-fixed/40 text-primary hover:bg-primary-fixed"
          >
            View lesson details
            <MaterialIcon name="chevron_right" size={18} />
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            fullWidth
            className="h-11 rounded-2xl"
            onClick={onEnroll}
          >
            <MaterialIcon name="assignment_turned_in" size={18} />
            Complete enrollment
          </Button>
        )}
      </div>
    </article>
  )
}
