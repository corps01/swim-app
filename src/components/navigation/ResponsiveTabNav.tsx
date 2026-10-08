import { cn } from '../../lib/cn'
import { MaterialIcon } from '../ui'

export interface TabNavItem {
  id: string
  label: string
  icon: string
  href: string
}

interface TabNavProps {
  items: TabNavItem[]
  activeHref: string
  onNavigate: (href: string) => void
  ariaLabel: string
}

export function MobileTabNav({ items, activeHref, onNavigate, ariaLabel }: TabNavProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 bg-surface-container-lowest/90 pb-safe shadow-[0_-4px_20px_rgba(8,145,178,0.08)] backdrop-blur-xl md:hidden"
      aria-label={ariaLabel}
    >
      <div className="mx-auto flex h-16 max-w-md items-stretch justify-around px-gutter-mobile">
        {items.map((item) => (
          <TabButton
            key={item.id}
            item={item}
            active={activeHref === item.href}
            onNavigate={onNavigate}
            layout="mobile"
          />
        ))}
      </div>
    </nav>
  )
}

export function DesktopTabNav({ items, activeHref, onNavigate, ariaLabel }: TabNavProps) {
  return (
    <nav className="hidden md:flex md:items-center md:gap-1" aria-label={ariaLabel}>
      {items.map((item) => (
        <TabButton
          key={item.id}
          item={item}
          active={activeHref === item.href}
          onNavigate={onNavigate}
          layout="desktop"
        />
      ))}
    </nav>
  )
}

function TabButton({
  item,
  active,
  onNavigate,
  layout,
}: {
  item: TabNavItem
  active: boolean
  onNavigate: (href: string) => void
  layout: 'mobile' | 'desktop'
}) {
  if (layout === 'desktop') {
    return (
      <button
        type="button"
        onClick={() => onNavigate(item.href)}
        className={cn(
          'flex items-center gap-2 rounded-full px-4 py-2 text-label-md transition-colors',
          active
            ? 'bg-primary-fixed/40 font-bold text-primary'
            : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
        )}
        aria-current={active ? 'page' : undefined}
      >
        <MaterialIcon name={item.icon} size={20} />
        {item.label}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onNavigate(item.href)}
      className={cn(
        'flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-0.5 px-2 py-1 transition-colors',
        active ? 'font-bold text-primary' : 'text-on-surface-variant',
      )}
      aria-current={active ? 'page' : undefined}
    >
      <MaterialIcon name={item.icon} size={24} />
      <span className="text-label-sm">{item.label}</span>
    </button>
  )
}
