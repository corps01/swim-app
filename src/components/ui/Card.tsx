import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type CardVariant = 'elevated' | 'muted' | 'outline'

const variants: Record<CardVariant, string> = {
  elevated: 'bg-surface-container-lowest p-card-padding shadow-md',
  muted: 'bg-surface-container-low p-4 shadow-sm',
  outline: 'border border-outline-variant/40 bg-surface-container-lowest p-card-padding',
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
}

export function Card({
  variant = 'elevated',
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-stack-base rounded-lg text-on-surface',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
