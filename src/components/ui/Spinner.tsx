import { cn } from '../../lib/cn'

interface SpinnerProps {
  label: string
  className?: string
}

export function Spinner({ label, className }: SpinnerProps) {
  return (
    <p className={cn('flex items-center gap-3 text-body-md text-on-surface-variant', className)} role="status">
      <span
        className="inline-block size-5 shrink-0 animate-spin rounded-full border-2 border-outline-variant border-t-primary"
        aria-hidden
      />
      {label}
    </p>
  )
}
