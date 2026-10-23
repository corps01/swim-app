import { MaterialIcon } from '../ui'
import { cn } from '../../lib/cn'

interface SettingsToggleProps {
  title: string
  description: string
  icon: string
  checked: boolean
  disabled?: boolean
  onChange?: (checked: boolean) => void
}

export function SettingsToggle({
  title,
  description,
  icon,
  checked,
  disabled = false,
  onChange,
}: SettingsToggleProps) {
  return (
    <div className="flex min-h-11 items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-container text-primary">
        <MaterialIcon name={icon} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-label-lg text-on-surface">{title}</span>
        <span className="block text-body-sm text-on-surface-variant">{description}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn(
          'relative h-8 w-14 shrink-0 rounded-full transition-colors',
          checked ? 'bg-secondary-container' : 'bg-surface-container-high',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <span
          className={cn(
            'absolute top-1 size-6 rounded-full bg-surface-container-lowest shadow transition-all',
            checked ? 'left-7' : 'left-1',
          )}
        />
      </button>
    </div>
  )
}
