import { useEffect, useState } from 'react'
import type { ParentClearanceStatus } from '../../lib/budsFitness'
import { Button, MaterialIcon, ProfileAvatar } from '../ui'
import { cn } from '../../lib/cn'

export interface TodayChild {
  id: string
  firstName: string
  lastName: string
  age: number | null
}

export interface TodayClassSlot {
  classId: string
  className: string
  location: string | null
  instructorName: string | null
  startLabel: string
  endLabel: string | null
  startsAt: string
}

export interface TodayBudsState {
  status: ParentClearanceStatus
  clearanceTimeLabel: string | null
  reasons: string[]
}

interface TodayChildCardProps {
  child: TodayChild
  todayClass: TodayClassSlot
  budsSubmission: TodayBudsState | null
  onCompleteForm: () => void
  onOpenChild?: () => void
  onOpenClass?: () => void
}

const zones: Record<
  ParentClearanceStatus,
  { capsule: string; dot: string; text: string; marker: string; markerIcon: string; title: string; shadow: string }
> = {
  MISSING: {
    capsule: 'bg-amber-50',
    dot: 'bg-amber-500 animate-pulse',
    text: 'text-amber-900',
    marker: 'bg-amber-400 text-amber-950',
    markerIcon: 'priority_high',
    title: 'Daily BUDS form required',
    shadow: 'shadow-[0_6px_22px_-2px_rgba(217,119,6,0.16),0_2px_6px_-1px_rgba(15,23,42,0.04)]',
  },
  CLEARED: {
    capsule: 'bg-emerald-50',
    dot: 'bg-emerald-600',
    text: 'text-emerald-800',
    marker: 'bg-secondary-container text-on-secondary-container',
    markerIcon: 'check',
    title: 'Cleared to swim',
    shadow: 'shadow-[0_4px_18px_-2px_rgba(0,100,124,0.08),0_2px_6px_-1px_rgba(15,23,42,0.04)]',
  },
  NOT_FIT: {
    capsule: 'bg-rose-50',
    dot: 'bg-rose-600',
    text: 'text-rose-900',
    marker: 'bg-rose-500 text-white',
    markerIcon: 'close',
    title: 'Stay home today',
    shadow: 'shadow-[0_6px_22px_-2px_rgba(185,5,56,0.12),0_2px_6px_-1px_rgba(15,23,42,0.04)]',
  },
  HOLD_DIET: {
    capsule: 'bg-yellow-50',
    dot: 'bg-yellow-500',
    text: 'text-yellow-900',
    marker: 'bg-yellow-300 text-yellow-950',
    markerIcon: 'restaurant',
    title: 'Meal hold',
    shadow: 'shadow-[0_4px_18px_-2px_rgba(0,100,124,0.08),0_2px_6px_-1px_rgba(15,23,42,0.04)]',
  },
  FLAGGED_CAUTION: {
    capsule: 'bg-orange-50',
    dot: 'bg-orange-500',
    text: 'text-orange-900',
    marker: 'bg-orange-300 text-orange-950',
    markerIcon: 'bedtime',
    title: 'Low sleep: swim with caution',
    shadow: 'shadow-[0_4px_18px_-2px_rgba(0,100,124,0.08),0_2px_6px_-1px_rgba(15,23,42,0.04)]',
  },
}

const neutralShadow = 'shadow-[0_4px_18px_-2px_rgba(0,100,124,0.08),0_2px_6px_-1px_rgba(15,23,42,0.04)]'

function countdownLabel(startsAt: string, now: number): string | null {
  const delta = new Date(startsAt).getTime() - now
  if (!Number.isFinite(delta)) return null
  if (delta <= 0) return 'In session'
  const totalMinutes = Math.max(1, Math.round(delta / 60000))
  if (totalMinutes < 60) return `in ${totalMinutes}m`
  return `in ${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
}

function statusDetail(buds: TodayBudsState, name: string): string | null {
  if (buds.status === 'CLEARED') return null
  if (buds.status === 'NOT_FIT') {
    const reason = buds.reasons[0]
    return reason ? `${reason}. Please rest today.` : 'Please rest today.'
  }
  if (buds.status === 'HOLD_DIET') {
    return buds.clearanceTimeLabel
      ? `Clear for water at ${buds.clearanceTimeLabel}.`
      : 'Waiting out the two-hour meal window.'
  }
  if (buds.status === 'FLAGGED_CAUTION') {
    return buds.reasons[0] ?? `${name} slept under 6 hours. The lesson can still happen.`
  }
  return `About 30 seconds. The deck needs it before ${name} swims.`
}

export function TodayChildCard({
  child,
  todayClass,
  budsSubmission,
  onCompleteForm,
  onOpenChild,
  onOpenClass,
}: TodayChildCardProps) {
  const [now, setNow] = useState(() => Date.now())
  const [passRequested, setPassRequested] = useState(false)
  const name = child.firstName.trim() || 'Your swimmer'
  const fullName = `${child.firstName} ${child.lastName}`.trim()
  const zone = budsSubmission ? zones[budsSubmission.status] : null
  const countdown = countdownLabel(todayClass.startsAt, now)
  const timeRange = todayClass.endLabel ? `${todayClass.startLabel} – ${todayClass.endLabel}` : todayClass.startLabel
  const detailLine = [todayClass.location?.trim(), todayClass.instructorName?.trim() && `Coach ${todayClass.instructorName.trim()}`]
    .filter(Boolean)
    .join(' · ')
  const detail = budsSubmission ? statusDetail(budsSubmission, name) : null

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  if (budsSubmission?.status === 'MISSING') {
    return (
      <article
        aria-label={`${fullName} daily form required`}
        className="flex h-full flex-col gap-1 rounded-2xl bg-amber-50 p-card-padding shadow-[0_4px_16px_-2px_rgba(217,119,6,0.14)]"
      >
        <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-label-sm font-extrabold uppercase tracking-wide text-amber-800">
                Action required
              </span>
              <span className="relative flex size-3 shrink-0 items-center justify-center">
                <span className="absolute size-3 animate-ping rounded-full bg-amber-500" />
                <span className="relative size-3 rounded-full bg-amber-600" />
              </span>
            </div>
            <p className="mt-1 text-headline-sm font-bold leading-snug text-amber-950">
              {name}&apos;s swim class starts at {todayClass.startLabel}
            </p>
            <p className="mt-0.5 text-body-md text-amber-900/90">
              {name}&apos;s daily BUDS form must be signed before check-in.
            </p>
            <button
              type="button"
              className="mt-3.5 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-amber-500 px-4 text-label-lg font-extrabold text-on-surface shadow-sm active:scale-[0.98]"
              onClick={onCompleteForm}
            >
              <MaterialIcon name="draw" size={18} />
              Tap to sign today&apos;s form
              <MaterialIcon name="arrow_forward" size={18} />
            </button>
        </div>
      </article>
    )
  }

  return (
    <article className={cn('flex h-full flex-col gap-3 rounded-3xl bg-surface-container-lowest p-card-padding', zone?.shadow ?? neutralShadow)}>
      <div className="flex items-start gap-3.5">
        <div className="relative shrink-0">
          <ProfileAvatar firstName={child.firstName} lastName={child.lastName} size="xl" />
          {zone ? (
            <span
              className={cn(
                'absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full shadow-md',
                zone.marker,
              )}
            >
              <MaterialIcon name={zone.markerIcon} size={14} filled />
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-1">
            {onOpenChild ? (
              <button type="button" onClick={onOpenChild} className="truncate text-left text-headline-md text-on-surface">
                {fullName}
              </button>
            ) : (
              <h3 className="truncate text-headline-md text-on-surface">{fullName}</h3>
            )}
            {child.age != null ? (
              <span className="shrink-0 text-label-sm text-on-surface-variant">Age {child.age}</span>
            ) : null}
          </div>
          {onOpenClass ? (
            <button
              type="button"
              onClick={onOpenClass}
              className="mt-0.5 inline-flex max-w-full items-center gap-1 rounded-full bg-surface-container-high px-2.5 py-0.5 text-label-sm font-semibold text-primary"
            >
              <MaterialIcon name="pool" size={12} />
              <span className="truncate">{todayClass.className}</span>
            </button>
          ) : (
            <span className="mt-0.5 inline-flex max-w-full items-center gap-1 rounded-full bg-surface-container-high px-2.5 py-0.5 text-label-sm font-semibold text-primary">
              <MaterialIcon name="pool" size={12} />
              <span className="truncate">{todayClass.className}</span>
            </span>
          )}

          <div className="mt-2.5 flex items-center gap-2 rounded-2xl bg-surface-container-low p-2">
            <MaterialIcon name="schedule" size={20} className="shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-label-lg text-on-surface">{timeRange}</p>
              {detailLine ? <p className="truncate text-body-sm text-on-surface-variant">{detailLine}</p> : null}
            </div>
            {countdown ? (
              <span className="shrink-0 rounded-full bg-primary-fixed px-2 py-0.5 text-label-sm text-on-primary-fixed-variant">
                {countdown}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {budsSubmission && zone ? (
        <div className={cn('rounded-2xl px-3 py-2', zone.capsule)}>
          <div className="flex items-center gap-2">
            <span className={cn('size-2.5 shrink-0 rounded-full', zone.dot)} />
            <span className={cn('flex-1 text-label-md font-bold', zone.text)}>{zone.title}</span>
          </div>
          {detail ? <p className="mt-1 pl-[18px] text-body-sm text-on-surface-variant">{detail}</p> : null}
        </div>
      ) : null}

      {budsSubmission?.status === 'NOT_FIT' ? (
        <Button
          type="button"
          variant="secondary"
          fullWidth
          className="h-11 rounded-full"
          disabled={passRequested}
          onClick={() => setPassRequested(true)}
        >
          <MaterialIcon name="token" size={18} />
          {passRequested ? 'Makeup pass requested' : 'Request makeup pass'}
        </Button>
      ) : null}
    </article>
  )
}
