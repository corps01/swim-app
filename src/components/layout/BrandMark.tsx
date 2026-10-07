import { cn } from '../../lib/cn'
import { MaterialIcon } from '../ui/MaterialIcon'

const sizes = {
  sm: {
    shell: 'size-11',
    icon: 20,
    badge: 'size-4',
    badgeIcon: 10,
  },
  lg: {
    shell: 'size-20',
    icon: 36,
    badge: 'size-6',
    badgeIcon: 14,
  },
} as const

export interface BrandMarkProps {
  size?: keyof typeof sizes
  className?: string
}

export function BrandMark({ size = 'lg', className }: BrandMarkProps) {
  const style = sizes[size]

  return (
    <div className={cn('relative shrink-0', className)}>
      <div
        className="absolute inset-0 scale-110 rounded-full bg-primary-container/20 blur-md"
        aria-hidden
      />
      <div
        className={cn(
          'relative flex items-center justify-center rounded-full bg-surface-container-lowest p-1.5 shadow-md',
          style.shell,
        )}
      >
        <div className="flex size-full items-center justify-center rounded-full bg-primary-fixed text-primary">
          <MaterialIcon name="waves" filled size={style.icon} />
        </div>
      </div>
      <div
        className={cn(
          'absolute -right-1 -bottom-1 flex items-center justify-center rounded-full bg-secondary-container text-on-secondary-container shadow-sm',
          style.badge,
        )}
      >
        <MaterialIcon name="waves" filled size={style.badgeIcon} />
      </div>
    </div>
  )
}
