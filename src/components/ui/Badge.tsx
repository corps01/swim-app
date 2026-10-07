import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger'
export type SessionStatus = 'completed' | 'missing' | 'cannot-attend'

const sessionStatus: Record<SessionStatus, { tone: BadgeTone; label: string }> = {
  completed: { tone: 'success', label: 'Completed' },
  missing: { tone: 'warning', label: 'Missing' },
  'cannot-attend': { tone: 'danger', label: 'Cannot Attend' },
}

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-surface-container text-on-surface-variant',
  primary: 'bg-surface-container-high text-primary',
  success: 'bg-secondary-container text-on-secondary-container',
  warning: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  danger: 'bg-error-container text-on-error-container',
}

const sizes = {
  sm: 'px-2.5 py-0.5',
  md: 'gap-1.5 px-3 py-1',
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  status?: SessionStatus
  size?: keyof typeof sizes
  pulse?: boolean
  children?: ReactNode
}

export function Badge({
  tone = 'neutral',
  status,
  size = 'sm',
  pulse = false,
  className,
  children,
  ...props
}: BadgeProps) {
  const resolvedTone = status ? sessionStatus[status].tone : tone
  const label = children ?? (status ? sessionStatus[status].label : null)

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full text-label-sm',
        sizes[size],
        tones[resolvedTone],
        className,
      )}
      {...props}
    >
      {pulse ? (
        <span className="size-1.5 rounded-full bg-current animate-pulse" aria-hidden />
      ) : null}
      {label}
    </span>
  )
}
