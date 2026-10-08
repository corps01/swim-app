import type { InstructorSwimmerEntry } from '../../lib/api/instructorSwimmers'
import { cn } from '../../lib/cn'
import { MaterialIcon } from '../ui'

export type SwimmerFormStatus = 'completed' | 'missing' | 'issues'

interface InstructorSwimmerCardProps {
  entry: InstructorSwimmerEntry
  displayStatus: SwimmerFormStatus
  onLogProgress: () => void
}

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

export function swimmerFormDisplayStatus(status: InstructorSwimmerEntry['status']): SwimmerFormStatus {
  if (status === 'active') return 'completed'
  return 'missing'
}

export function InstructorSwimmerCard({ entry, displayStatus, onLogProgress }: InstructorSwimmerCardProps) {
  const fullName = `${entry.firstName} ${entry.lastName}`
  const isCompleted = displayStatus === 'completed'
  const isMissing = displayStatus === 'missing'
  const showChevron = isCompleted

  return (
    <article
      className={cn(
        'group relative rounded-lg bg-surface-container-lowest p-card-padding shadow-[0_4px_16px_-2px_rgba(0,100,124,0.06)] transition-all',
        isCompleted && 'cursor-pointer active:scale-[0.99]',
      )}
      data-name={fullName.toLowerCase()}
      data-status={displayStatus}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="relative size-12 shrink-0">
            <div className="size-full overflow-hidden rounded-full bg-surface-container-high">
              <div
                className="flex size-full items-center justify-center bg-primary-fixed text-label-lg font-bold text-on-primary-fixed-variant"
                aria-hidden
              >
                {initials(entry.firstName, entry.lastName)}
              </div>
            </div>
            <div
              className={cn(
                'absolute bottom-0 right-0 z-10 size-3.5 rounded-full border-2 border-surface-container-lowest',
                isCompleted && 'bg-secondary',
                isMissing && 'bg-amber-500',
                displayStatus === 'issues' && 'bg-tertiary',
              )}
              aria-hidden
            />
          </div>

          <div className="flex min-w-0 flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-headline-sm text-on-surface">{fullName}</h3>
              <StatusBadge status={displayStatus} />
            </div>

            {displayStatus === 'issues' ? (
              <p className="mt-0.5 flex items-center gap-1 text-body-sm font-medium text-tertiary">
                <MaterialIcon name="info" size={15} />
                Health note on file
              </p>
            ) : null}

            <p className="mt-0.5 flex items-center gap-1 text-body-sm text-on-surface-variant">
              <MaterialIcon name="family_restroom" size={15} className="text-outline" />
              Parent: <span className="font-medium text-on-surface">{entry.parentName}</span>
            </p>

            <div className="mt-2 flex items-center gap-1.5 text-label-sm text-on-surface-variant">
              <MaterialIcon name="schedule" size={14} className="text-primary" />
              <span>Upcoming session</span>
              <span className="size-1 rounded-full bg-outline-variant" aria-hidden />
              <span className="truncate font-semibold text-primary">{entry.classLabel}</span>
            </div>
          </div>
        </div>

        {showChevron ? (
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-outline transition-colors group-hover:bg-primary/10 group-hover:text-primary"
            aria-hidden
          >
            <MaterialIcon name="chevron_right" size={20} />
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onLogProgress}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-fixed/25 px-3 py-2 text-label-md font-bold text-primary active:scale-95"
        >
          <MaterialIcon name="photo_camera" size={18} />
          Log progress
        </button>
      </div>

      {isMissing ? (
        <div className="-mx-card-padding -mb-card-padding mt-3 flex items-center justify-between rounded-b-lg bg-surface-container-low/50 px-card-padding py-2.5">
          <span className="text-label-sm text-outline">Liability &amp; health waiver</span>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-label-md text-on-primary shadow-[0_2px_8px_rgba(0,100,124,0.18)] transition-all active:scale-95"
          >
            <MaterialIcon name="send" size={16} />
            Send reminder
          </button>
        </div>
      ) : null}
    </article>
  )
}

function StatusBadge({ status }: { status: SwimmerFormStatus }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary-container px-2 py-0.5 text-label-sm font-semibold text-on-secondary-container">
        <MaterialIcon name="check_circle" size={13} />
        Completed
      </span>
    )
  }
  if (status === 'issues') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-error-container px-2 py-0.5 text-label-sm font-semibold text-on-error-container">
        <MaterialIcon name="thermostat" size={13} />
        Issue
      </span>
    )
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-label-sm font-semibold text-amber-900">
      <MaterialIcon name="warning" size={13} />
      Missing form
    </span>
  )
}
