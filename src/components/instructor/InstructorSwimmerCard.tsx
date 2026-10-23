import type { InstructorSwimmerEntry } from '../../lib/api/instructorSwimmers'
import type { SwimmerFormCompliance } from '../../types/questionnaire'
import { cn } from '../../lib/cn'
import { Badge, MaterialIcon, ProfileAvatar } from '../ui'
import { FormComplianceBadge } from './FormComplianceBadge'

export type SwimmerFormStatus = 'completed' | 'missing' | 'issues'

interface InstructorSwimmerCardProps {
  entry: InstructorSwimmerEntry
  displayStatus: SwimmerFormStatus
  formCompliance?: SwimmerFormCompliance | null
  onLogProgress: () => void
  onOpen?: () => void
  onOpenSubmission?: () => void
  onOpenClass?: () => void
  onOpenHistory?: () => void
}

export function swimmerFormDisplayStatus(status: InstructorSwimmerEntry['status']): SwimmerFormStatus {
  if (status === 'active') return 'completed'
  return 'missing'
}

export function InstructorSwimmerCard({
  entry,
  displayStatus,
  formCompliance,
  onLogProgress,
  onOpen,
  onOpenSubmission,
  onOpenClass,
  onOpenHistory,
}: InstructorSwimmerCardProps) {
  const fullName = `${entry.firstName} ${entry.lastName}`
  const isCompleted = displayStatus === 'completed'
  const isMissing = displayStatus === 'missing'
  const showChevron = isCompleted

  return (
    <article
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-[0_12px_28px_-16px_rgba(15,23,42,0.18)]',
        isCompleted && 'cursor-pointer active:scale-[0.99]',
      )}
      data-name={fullName.toLowerCase()}
      data-status={displayStatus}
    >
      <div className="flex items-start justify-between gap-3 border-b border-outline-variant/20 px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <ProfileAvatar firstName={entry.firstName} lastName={entry.lastName} />
          <div className="min-w-0">
            {onOpen ? (
              <button type="button" onClick={onOpen} className="truncate text-left text-headline-sm text-on-surface">
                {fullName}
              </button>
            ) : (
              <h3 className="truncate text-headline-sm text-on-surface">{fullName}</h3>
            )}
            {displayStatus === 'issues' ? (
              <p className="mt-0.5 flex items-center gap-1 text-body-sm font-medium text-tertiary">
                <MaterialIcon name="info" size={15} />
                Health note on file
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {formCompliance ? (
            <FormComplianceBadge
              status={formCompliance.status}
              swimmerName={fullName}
              onOpen={
                formCompliance.status === 'signed' && formCompliance.submissionId
                  ? onOpenSubmission
                  : undefined
              }
            />
          ) : (
            <StatusBadge status={displayStatus} />
          )}
          {showChevron ? <MaterialIcon name="chevron_right" size={20} className="text-outline" /> : null}
        </div>
      </div>

      <div className="flex flex-col gap-1 px-4 py-3 text-body-sm text-on-surface-variant">
        <p className="flex items-center gap-1">
          <MaterialIcon name="family_restroom" size={15} />
          Parent: <span className="font-medium text-on-surface">{entry.parentName}</span>
        </p>
        <p className="flex min-w-0 items-center gap-1.5">
          <MaterialIcon name="schedule" size={14} className="text-primary" />
          <span>Upcoming session</span>
          {onOpenClass ? (
            <button type="button" onClick={onOpenClass} className="truncate font-semibold text-primary">
              {entry.classLabel}
            </button>
          ) : (
            <span className="truncate font-semibold text-primary">{entry.classLabel}</span>
          )}
        </p>
      </div>

      <div className="mt-auto flex flex-col gap-2 border-t border-outline-variant/20 px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onLogProgress}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-label-md font-semibold text-on-primary active:scale-95"
          >
            <MaterialIcon name="photo_camera" size={18} />
            Log progress
          </button>
          {onOpenHistory ? (
            <button
              type="button"
              onClick={onOpenHistory}
              className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-label-md font-semibold text-on-surface active:scale-95"
            >
              <MaterialIcon name="fact_check" size={18} />
              BUDS history
            </button>
          ) : null}
        </div>
        {isMissing ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-label-sm text-outline">Liability &amp; health waiver</span>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant/40 px-3 py-2 text-label-md font-semibold text-on-surface active:scale-95"
            >
              <MaterialIcon name="send" size={16} />
              Send reminder
            </button>
          </div>
        ) : null}
      </div>
    </article>
  )
}

function StatusBadge({ status }: { status: SwimmerFormStatus }) {
  if (status === 'completed') return <Badge tone="success">Completed</Badge>
  if (status === 'issues') return <Badge tone="danger">Issue</Badge>
  return <Badge tone="warning">Missing form</Badge>
}
