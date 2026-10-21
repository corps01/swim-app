import { MaterialIcon } from '../ui'
import { cn } from '../../lib/cn'

interface FormComplianceBadgeProps {
  status: 'signed' | 'pending'
  swimmerName: string
  onOpen?: () => void
}

export function FormComplianceBadge({ status, swimmerName, onOpen }: FormComplianceBadgeProps) {
  const signed = status === 'signed'
  const label = signed ? 'Form Signed' : 'Form Pending'
  const tone = signed
    ? 'bg-secondary-container text-on-secondary-container'
    : 'bg-amber-100 text-amber-900'
  const icon = signed ? 'check_circle' : 'warning'

  if (onOpen) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label={signed ? `View signed form for ${swimmerName}` : `Open pending form for ${swimmerName}`}
        className={cn(
          'inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full px-3 text-label-sm font-bold active:scale-95',
          tone,
        )}
      >
        <MaterialIcon name={icon} size={16} />
        {label}
      </button>
    )
  }

  return (
    <span className={cn('inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full px-3 text-label-sm font-bold', tone)}>
      <MaterialIcon name={icon} size={16} />
      {label}
    </span>
  )
}
