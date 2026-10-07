import { AlertCircle, Check, Clock } from 'lucide-react'
import { ageFromDateOfBirth, type SwimmerRosterEntry } from '../../lib/swimmers'
import { cn } from '../../lib/cn'
import { Badge, Button } from '../ui'

interface SwimmerCardProps {
  swimmer: SwimmerRosterEntry
}

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

export function SwimmerCard({ swimmer }: SwimmerCardProps) {
  const age = ageFromDateOfBirth(swimmer.dateOfBirth)
  const cleared = swimmer.formStatus === 'completed'

  return (
    <article
      className={cn(
        'rounded-lg bg-surface-container-lowest p-card-padding shadow-[0_4px_18px_-2px_rgba(0,100,124,0.08)]',
        !cleared && 'shadow-[0_6px_22px_-2px_rgba(185,5,56,0.12)]',
      )}
    >
      <div className="flex items-start gap-3.5">
        <div className="relative shrink-0">
          <div
            className="flex size-16 items-center justify-center rounded-2xl bg-primary-fixed text-lg font-bold text-on-primary-fixed-variant shadow-[0_4px_12px_rgba(0,100,124,0.15)]"
            aria-hidden
          >
            {initials(swimmer.firstName, swimmer.lastName)}
          </div>
          <span
            className={cn(
              'absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full shadow-md',
              cleared
                ? 'bg-secondary-container text-on-secondary-container'
                : 'bg-tertiary-container text-on-tertiary-container',
            )}
          >
            {cleared ? (
              <Check className="size-3.5" strokeWidth={3} aria-hidden />
            ) : (
              <AlertCircle className="size-3.5" aria-hidden />
            )}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-1">
            <h4 className="truncate text-headline-md text-on-surface">
              {swimmer.firstName} {swimmer.lastName}
            </h4>
            {age != null ? (
              <span className="shrink-0 text-label-sm text-on-surface-variant">Age {age}</span>
            ) : null}
          </div>
          <Badge tone="primary" className="mt-1">{swimmer.levelLabel}</Badge>

          <div className="mt-2.5 flex items-center gap-2 rounded bg-surface-container-low p-2">
            <Clock className="size-[18px] shrink-0 text-primary" aria-hidden />
            <div className="min-w-0">
              <p className="truncate text-label-md font-semibold text-on-surface">
                {swimmer.sessionLabel}
              </p>
              <p className="truncate text-body-sm text-on-surface-variant">
                {swimmer.classLabel} · {swimmer.coachName}
              </p>
            </div>
          </div>
        </div>
      </div>

      {cleared ? (
        <div className="mt-3 flex items-center justify-between rounded bg-surface-container-low/70 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-secondary" aria-hidden />
            <span className="text-label-md font-bold text-secondary">Cleared to swim</span>
          </div>
          {swimmer.signedAtLabel ? (
            <span className="text-label-sm text-on-surface-variant">{swimmer.signedAtLabel}</span>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2.5 rounded bg-error-container/60 px-3 py-2">
          <span className="size-2.5 shrink-0 animate-ping rounded-full bg-tertiary" aria-hidden />
          <span className="flex-1 text-label-md font-bold text-on-error-container">
            Pre-session form required
          </span>
          <Badge status="missing" />
        </div>
      )}

      {!cleared ? (
        <Button type="button" fullWidth className="mt-3 h-12">
          Start health check
        </Button>
      ) : null}
    </article>
  )
}
