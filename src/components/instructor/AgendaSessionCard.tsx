import type { AgendaSession, AgendaSwimmerSummary } from '../../lib/api/agenda'
import type { SessionTimingBadge } from '../../lib/agendaSessionTiming'
import { formatTime12h, formatTimeRange12h } from '../../lib/classSchedule'
import { MaterialIcon } from '../ui'
import { cn } from '../../lib/cn'

function locationBadge(session: AgendaSession): string {
  const base = session.location?.trim() || 'Pool TBD'
  const detail = session.locationDetail?.trim()
  return detail ? `${base} — ${detail}` : base
}

function TimingPill({ badge }: { badge: SessionTimingBadge }) {
  if (badge === 'next_up') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container px-2.5 py-1 text-label-sm font-bold text-on-secondary-container">
        <MaterialIcon name="alarm" size={14} />
        Next up
      </span>
    )
  }
  if (badge === 'in_session') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container px-2.5 py-1 text-label-sm font-bold text-on-secondary-container">
        <MaterialIcon name="play_circle" size={14} />
        In session
      </span>
    )
  }

  const label =
    badge === 'morning' ? 'Morning' : badge === 'evening' ? 'Evening' : 'Later'

  return (
    <span className="rounded-full bg-surface-container-high px-2.5 py-1 text-label-sm font-semibold text-on-surface-variant">
      {label}
    </span>
  )
}

function SwimmerDeckChip({ swimmer }: { swimmer: AgendaSwimmerSummary }) {
  const alert = swimmer.hasMedicalFlag || swimmer.hasFormAlert
  const label = `${swimmer.firstName} ${swimmer.lastName.charAt(0)}.`

  if (alert) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-tertiary-fixed px-3 py-1.5 text-label-md text-on-tertiary-fixed shadow-sm"
        title={
          swimmer.hasMedicalFlag
            ? 'Medical note on file'
            : 'Form or waiver pending'
        }
      >
        <MaterialIcon
          name={swimmer.hasMedicalFlag ? 'health_and_safety' : 'warning'}
          size={15}
          className="text-tertiary"
        />
        {label}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-low px-3 py-1.5 text-label-md text-on-surface shadow-sm">
      <span className="size-2 rounded-full bg-secondary" aria-hidden />
      {label}
    </span>
  )
}

interface AgendaSessionCardProps {
  session: AgendaSession
  timingBadge: SessionTimingBadge
  emphasize?: boolean
  onOpen: () => void
}

export function AgendaSessionCard({
  session,
  timingBadge,
  emphasize = false,
  onOpen,
}: AgendaSessionCardProps) {
  const duration =
    session.durationMinutes != null && session.durationMinutes > 0
      ? `${session.durationMinutes} mins`
      : null

  const enrolled = session.swimmers.length
  const formsComplete = session.swimmers.filter((s) => !s.hasFormAlert).length
  const formsPct = enrolled > 0 ? Math.round((formsComplete / enrolled) * 100) : 0

  return (
    <article
      className={cn(
        'cursor-pointer rounded-lg bg-surface-container-lowest p-card-padding text-left transition-all active:scale-[0.99]',
        emphasize
          ? 'shadow-[0_12px_28px_-4px_rgba(8,145,178,0.12),0_4px_10px_-2px_rgba(15,23,42,0.06)]'
          : 'shadow-[0_4px_16px_-2px_rgba(8,145,178,0.08),0_2px_6px_-1px_rgba(15,23,42,0.04)]',
      )}
    >
      <button type="button" className="w-full text-left" onClick={onOpen}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <TimingPill badge={timingBadge} />
            <span className="text-headline-sm text-on-surface">
              {timingBadge === 'next_up' || timingBadge === 'in_session'
                ? formatTime12h(session.startTime)
                : formatTimeRange12h(session.startTime, session.endTime)}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-fixed px-3 py-1 text-label-md font-bold text-on-primary-fixed-variant">
            <MaterialIcon name="pool" size={16} />
            {locationBadge(session)}
          </span>
        </div>

        <div className="mt-3 flex items-start justify-between gap-2">
          <div>
            <h4 className="text-headline-sm font-bold text-on-surface">{session.className}</h4>
            <p className="mt-0.5 flex items-center gap-1.5 text-body-md text-on-surface-variant">
              <MaterialIcon name="groups" size={16} className="text-primary" />
              {enrolled} enrolled
              {formsComplete === enrolled && enrolled > 0 ? (
                <span className="font-semibold text-secondary"> · Forms complete</span>
              ) : null}
            </p>
          </div>
          {duration ? (
            <span className="shrink-0 rounded-full bg-surface-container-high px-2 py-0.5 text-label-sm font-semibold text-primary">
              {duration}
            </span>
          ) : null}
        </div>

        <div className="mt-3.5">
          <p className="mb-2 text-label-sm uppercase tracking-wider text-outline">
            Swimmer deck check ({enrolled})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {enrolled === 0 ? (
              <span className="text-body-sm text-on-surface-variant">No swimmers enrolled yet</span>
            ) : (
              session.swimmers.map((swimmer) => (
                <SwimmerDeckChip key={swimmer.childId} swimmer={swimmer} />
              ))
            )}
          </div>
        </div>
      </button>

      <div className="-mx-card-padding -mb-card-padding mt-4 flex items-center justify-between rounded-b-lg bg-surface-container-low/60 px-card-padding py-3 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="h-2 w-14 overflow-hidden rounded-full bg-surface-container-highest">
            <div
              className="h-full rounded-full bg-secondary transition-all"
              style={{ width: `${formsPct}%` }}
            />
          </div>
          <span className="truncate text-label-sm text-on-surface-variant">
            {formsComplete}/{enrolled} forms signed
          </span>
        </div>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1 text-label-md font-bold text-primary"
          onClick={(event) => {
            event.stopPropagation()
            onOpen()
          }}
        >
          Open deck mode
          <MaterialIcon name="arrow_forward" size={18} />
        </button>
      </div>
    </article>
  )
}
