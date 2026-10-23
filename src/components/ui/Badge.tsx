import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger'
export type SessionStatus = 'completed' | 'missing' | 'cannot-attend'

const sessionStatus: Record<SessionStatus, { tone: BadgeTone; label: string }> = {
  completed: { tone: 'success', label: 'Completed' },
  missing: { tone: 'warning', label: 'Missing' },
  'cannot-attend': { tone: 'danger', label: 'Cannot Attend' },
}

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-600',
  primary: 'bg-cyan-50 text-cyan-800',
  success: 'bg-emerald-50 text-emerald-800',
  warning: 'bg-amber-50 text-amber-800',
  danger: 'bg-red-50 text-red-800',
}

const dots: Record<BadgeTone, string> = {
  neutral: 'bg-slate-400',
  primary: 'bg-cyan-600',
  success: 'bg-emerald-500',
  warning: 'bg-amber-600',
  danger: 'bg-red-600',
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  status?: SessionStatus
  /** Kept so older call sites still type-check. Height is always the shared pill. */
  size?: 'sm' | 'md'
  pulse?: boolean
  dot?: boolean
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick']
  children?: ReactNode
}

export function Badge({
  tone = 'neutral',
  status,
  pulse,
  dot = true,
  size: _size,
  className,
  children,
  onClick,
  ...props
}: BadgeProps) {
  const resolvedTone = status ? sessionStatus[status].tone : tone
  const label = children ?? (status ? sessionStatus[status].label : null)
  const showPulse = pulse ?? resolvedTone === 'warning'
  const classes = cn(
    'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-extrabold uppercase tracking-wide',
    tones[resolvedTone],
    onClick && 'active:scale-95',
    className,
  )
  const content = (
    <>
      {dot ? <BadgeDot tone={resolvedTone} pulse={showPulse} /> : null}
      {label}
    </>
  )

  if (onClick) {
    const ariaLabel = props['aria-label']
    return (
      <button type="button" className={classes} onClick={onClick} aria-label={typeof ariaLabel === 'string' ? ariaLabel : undefined}>
        {content}
      </button>
    )
  }

  return (
    <span className={classes} {...props}>
      {content}
    </span>
  )
}

function BadgeDot({ tone, pulse }: { tone: BadgeTone; pulse: boolean }) {
  if (!pulse) {
    return <span className={cn('size-1.5 rounded-full', dots[tone])} aria-hidden />
  }
  return (
    <span className="relative flex size-2.5" aria-hidden>
      <span className={cn('absolute size-2.5 animate-ping rounded-full', tone === 'warning' ? 'bg-amber-500' : dots[tone])} />
      <span className={cn('relative size-2.5 rounded-full', dots[tone])} />
    </span>
  )
}
