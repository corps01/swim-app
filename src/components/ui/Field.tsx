import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface FieldProps {
  id: string
  label?: string
  hint?: ReactNode
  error?: string
  className?: string
  children: ReactNode
}

export function Field({
  id,
  label,
  hint,
  error,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label || hint ? (
        <div className="flex items-center justify-between gap-3">
          {label ? (
            <label htmlFor={id} className="text-label-md text-on-surface">
              {label}
            </label>
          ) : (
            <span />
          )}
          {hint ? <div className="text-label-sm text-primary">{hint}</div> : null}
        </div>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  )
}
