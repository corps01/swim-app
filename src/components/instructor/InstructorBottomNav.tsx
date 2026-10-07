import { cn } from '../../lib/cn'
import { MaterialIcon } from '../ui'

/** Visual-only deck nav; only Students is the active screen today. */
export function InstructorBottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 bg-surface/90 pb-safe shadow-[0_-4px_20px_rgba(0,100,124,0.08)] backdrop-blur-xl"
      aria-label="Coach navigation"
    >
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-gutter-mobile">
        <NavItem icon="calendar_today" label="Home" />
        <NavItem icon="groups" label="Students" active />
        <NavItem icon="notifications" label="Notifications" badge />
        <NavItem icon="account_circle" label="Profile" />
      </div>
    </nav>
  )
}

function NavItem({
  icon,
  label,
  active = false,
  badge = false,
}: {
  icon: string
  label: string
  active?: boolean
  badge?: boolean
}) {
  return (
    <button
      type="button"
      disabled
      className={cn(
        'flex min-h-12 min-w-12 flex-col items-center justify-center gap-0.5 px-2 py-1 transition-colors',
        active ? 'font-bold text-primary' : 'text-on-surface-variant',
      )}
      aria-current={active ? 'page' : undefined}
    >
      <span className="relative flex items-center justify-center">
        <MaterialIcon name={icon} size={24} />
        {badge ? (
          <span className="absolute -right-1 -top-0.5 size-2.5 rounded-full bg-tertiary" aria-hidden />
        ) : null}
      </span>
      <span className="text-label-sm">{label}</span>
    </button>
  )
}
