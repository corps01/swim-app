import { useEffect, useState } from 'react'
import type { TodayClearance } from '../../lib/api/budsClearance'
import type { ParentClearanceStatus } from '../../lib/budsFitness'
import { Button, MaterialIcon, ProfileAvatar } from '../ui'
import { cn } from '../../lib/cn'

interface ParentClearanceCardProps {
  clearance: TodayClearance
  location?: string | null
  instructorName?: string | null
  onCompleteForm: () => void
  onContactSchool: () => void
}

const pills: Record<ParentClearanceStatus, { label: string; icon: string; className: string }> = {
  CLEARED: {
    label: 'Clear',
    icon: 'check_circle',
    className: 'bg-secondary-container text-on-secondary-container',
  },
  NOT_FIT: {
    label: 'Stay home',
    icon: 'pause_circle',
    className: 'bg-error-container text-on-error-container',
  },
  HOLD_DIET: {
    label: 'Meal hold',
    icon: 'restaurant',
    className: 'bg-amber-100 text-amber-950',
  },
  FLAGGED_CAUTION: {
    label: 'Low sleep',
    icon: 'bedtime',
    className: 'bg-orange-100 text-orange-950',
  },
  MISSING: {
    label: 'Form due',
    icon: 'assignment_late',
    className: 'bg-primary-fixed text-on-primary-fixed',
  },
}

const heroes: Record<ParentClearanceStatus, { icon: string; iconClass: string; wash: string }> = {
  CLEARED: {
    icon: 'pool',
    iconClass: 'bg-secondary text-on-secondary',
    wash: 'bg-gradient-to-br from-secondary-container via-surface-container-low to-surface-container-lowest',
  },
  NOT_FIT: {
    icon: 'bedtime',
    iconClass: 'bg-tertiary text-on-tertiary',
    wash: 'bg-gradient-to-br from-error-container via-surface-container-low to-surface-container-lowest',
  },
  HOLD_DIET: {
    icon: 'restaurant',
    iconClass: 'bg-amber-600 text-white',
    wash: 'bg-gradient-to-br from-amber-100 via-surface-container-low to-surface-container-lowest',
  },
  FLAGGED_CAUTION: {
    icon: 'bedtime',
    iconClass: 'bg-orange-700 text-white',
    wash: 'bg-gradient-to-br from-orange-100 via-surface-container-low to-surface-container-lowest',
  },
  MISSING: {
    icon: 'fact_check',
    iconClass: 'bg-primary text-on-primary',
    wash: 'bg-gradient-to-br from-primary-fixed via-surface-container-low to-surface-container-lowest',
  },
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || 'Your swimmer'
}

function headline(clearance: TodayClearance, name: string): string {
  if (clearance.status === 'CLEARED') return `${name} is clear for the ${clearance.classTimeLabel} lesson`
  if (clearance.status === 'NOT_FIT') return `${name} should stay home & rest today`
  if (clearance.status === 'HOLD_DIET') {
    return `Meal hold — clear for water at ${clearance.clearanceTimeLabel ?? 'the end of the meal window'}`
  }
  if (clearance.status === 'FLAGGED_CAUTION') {
    return `Caution for ${name}'s ${clearance.classTimeLabel} lesson`
  }
  return `Complete ${name}'s daily BUDS form`
}

function supportCopy(clearance: TodayClearance, name: string): string {
  if (clearance.status === 'CLEARED') {
    return `${name} can go in the water for today's lesson. The deck will see a clear badge.`
  }
  if (clearance.status === 'NOT_FIT') {
    return `Resting today keeps ${name} on a quicker path back to the pool, and keeps the water safer for the rest of the class.`
  }
  if (clearance.status === 'HOLD_DIET') {
    return `A meal needs two hours before class, measured on the pool's clock. ${name} can enter the water once that window ends.`
  }
  if (clearance.status === 'FLAGGED_CAUTION') {
    return `${name} slept under 6 hours. The lesson can still happen, and the coach will see a caution badge on the deck.`
  }
  return `Today's health check is still open. The deck cannot clear ${name} until this form is in.`
}

export function ParentClearanceCard({
  clearance,
  location,
  instructorName,
  onCompleteForm,
  onContactSchool,
}: ParentClearanceCardProps) {
  const name = firstName(clearance.swimmerName)
  const pill = pills[clearance.status]
  const hero = heroes[clearance.status]
  const place = location?.trim()
  const coach = instructorName?.trim()

  return (
    <article className="flex flex-col gap-stack-base" aria-label={`${clearance.swimmerName} fitness clearance`}>
      <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low p-card-padding shadow-sm">
        <div className="flex min-w-0 items-center gap-stack-base">
          <div className="relative shrink-0">
            <ProfileAvatar name={clearance.swimmerName} size="lg" />
            <div
              className={cn(
                'absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full shadow-sm',
                pill.className,
              )}
            >
              <MaterialIcon name={pill.icon} size={14} filled />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="truncate text-headline-sm text-on-surface">{clearance.swimmerName}</h2>
              {place ? (
                <span className="shrink-0 rounded-full bg-surface-container-highest px-2 py-0.5 text-label-sm text-on-surface-variant">
                  {place}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-1 text-body-sm text-on-surface-variant">
              <MaterialIcon name="pool" size={15} className="text-primary" />
              <span>{clearance.className}</span>
              <span className="text-outline-variant">•</span>
              <span>Today, {clearance.classTimeLabel}</span>
              <ClassCountdown startsAt={clearance.classStartsAt} />
            </p>
          </div>
        </div>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-label-sm',
            pill.className,
          )}
        >
          <MaterialIcon name={pill.icon} size={13} filled />
          {pill.label}
        </span>
      </div>

      <div className={cn('relative overflow-hidden rounded-lg p-card-padding shadow-sm', hero.wash)}>
        <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-primary/5 blur-2xl" />
        <div className="relative z-10 flex items-start gap-stack-base">
          <div
            className={cn(
              'flex size-12 shrink-0 items-center justify-center rounded-full shadow-md',
              hero.iconClass,
            )}
          >
            <MaterialIcon name={hero.icon} size={24} filled />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="text-headline-lg-mobile leading-snug text-on-surface">{headline(clearance, name)}</h3>
            <p className="text-body-md text-on-surface-variant">{supportCopy(clearance, name)}</p>
          </div>
        </div>
        {clearance.reasons.length > 0 ? (
          <ul className="relative z-10 mt-stack-base flex flex-col gap-2">
            {clearance.reasons.map((reason) => (
              <li
                key={reason}
                className="flex items-center gap-2 rounded-lg bg-surface-container-lowest/80 px-3 py-2 text-on-surface backdrop-blur-sm"
              >
                <MaterialIcon
                  name={clearance.status === 'HOLD_DIET' ? 'restaurant' : clearance.status === 'FLAGGED_CAUTION' ? 'bedtime' : 'thermostat'}
                  size={18}
                  filled
                  className="shrink-0 text-tertiary"
                />
                <span className="text-label-md text-on-error-container">Reported</span>
                <span className="min-w-0 truncate text-body-md font-medium">{reason}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {clearance.status === 'NOT_FIT' ? (
        <NotFitFollowUp name={name} coach={coach} onContactSchool={onContactSchool} />
      ) : null}

      {clearance.status === 'MISSING' ? (
        <Button type="button" fullWidth className="h-touch-action rounded-full" onClick={onCompleteForm}>
          <MaterialIcon name="fact_check" size={20} />
          Complete Daily BUDS Form
        </Button>
      ) : null}

      {coach && clearance.status !== 'NOT_FIT' ? (
        <p className="text-center text-body-sm text-on-surface-variant">
          Coach {coach} sees this status on the deck.
        </p>
      ) : null}
    </article>
  )
}

function ClassCountdown({ startsAt }: { startsAt: string }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const delta = new Date(startsAt).getTime() - now
  if (!Number.isFinite(delta)) return null
  const label =
    delta <= 0
      ? 'In session'
      : delta < 60 * 60 * 1000
        ? `Starts in ${Math.max(1, Math.round(delta / 60000))} min`
        : `Starts in ${Math.floor(delta / 3_600_000)}h ${Math.round((delta % 3_600_000) / 60000)}m`

  return (
    <>
      <span className="text-outline-variant">•</span>
      <span className="font-semibold text-primary">{label}</span>
    </>
  )
}

function NotFitFollowUp({
  name,
  coach,
  onContactSchool,
}: {
  name: string
  coach?: string
  onContactSchool: () => void
}) {
  const [passRequested, setPassRequested] = useState(false)

  return (
    <>
      <div className="flex flex-col gap-stack-tight rounded-lg bg-surface-container-lowest p-card-padding shadow-[0_4px_16px_-2px_rgba(0,100,124,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
              <MaterialIcon name="token" size={20} filled />
            </div>
            <div>
              <span className="block text-label-sm uppercase tracking-wider text-secondary">No penalty for resting</span>
              <h3 className="text-headline-sm text-on-surface">
                {passRequested ? '+1 makeup pass requested' : 'Makeup pass available'}
              </h3>
            </div>
          </div>
          <span className="rounded-full bg-secondary-fixed px-3 py-1 text-label-md text-on-secondary-fixed">
            {passRequested ? 'Requested' : 'Ready'}
          </span>
        </div>
        <p className="pt-1 text-body-sm text-on-surface-variant">
          Staying home does not count against {name}. Ask the school to book the makeup once {name} is well.
        </p>
      </div>

      {coach ? (
        <div className="flex items-start gap-stack-base rounded-lg bg-surface-container p-card-padding">
          <ProfileAvatar name={coach} size="md" />
          <div className="min-w-0">
            <h4 className="text-headline-sm text-on-surface">On Coach {coach}&apos;s deck</h4>
            <p className="text-body-sm text-on-surface-variant">
              {name}&apos;s lane shows a stay-home badge so the coach knows this lesson is excused.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-stack-base rounded-lg bg-surface-container-low p-card-padding">
        <div className="flex items-center gap-2">
          <MaterialIcon name="event_available" size={20} className="text-primary" />
          <h3 className="text-headline-sm text-on-surface">When can {name} splash back?</h3>
        </div>
        <ol className="flex flex-col gap-3">
          <ReturnStep
            step="1"
            title="24 hours fever-free"
            body="Temperature under 100°F without fever-reducing medicine."
          />
          <ReturnStep
            step="2"
            title="48 hours stomach-clear"
            body="No vomiting or diarrhea for 48 hours before the next lesson."
          />
          <ReturnStep
            step="3"
            title="Energy back"
            body={`Ready to kick, float, and splash safely with the coach and the class.`}
          />
        </ol>
      </div>

      <div className="flex flex-col gap-3">
        {!passRequested ? (
          <Button
            type="button"
            fullWidth
            className="h-touch-action rounded-full"
            onClick={() => setPassRequested(true)}
          >
            <MaterialIcon name="token" size={20} />
            Request makeup pass
          </Button>
        ) : null}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={onContactSchool}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-label-md text-primary hover:bg-surface-container-high"
          >
            <MaterialIcon name="call" size={18} />
            Contact the school
          </button>
        </div>
      </div>
    </>
  )
}

function ReturnStep({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-label-sm text-primary">
        {step}
      </div>
      <div>
        <span className="text-label-md text-on-surface">{title}</span>
        <p className="text-body-sm text-on-surface-variant">{body}</p>
      </div>
    </li>
  )
}
