import { BrandMark } from '../layout/BrandMark'
import { Button, MaterialIcon } from '../ui'

interface HomeHeaderProps {
  onSignOut: () => void
  parentName?: string
}

function parentInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'P'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export function HomeHeader({ onSignOut, parentName = 'Parent' }: HomeHeaderProps) {
  return (
    <header
      className="fixed inset-x-0 top-0 z-50 border-b border-outline-variant/30 bg-surface/85 pt-safe backdrop-blur-xl shadow-[0_1px_12px_rgba(0,100,124,0.06)]"
    >
      <div className="mx-auto flex h-16 max-w-md items-center justify-between gap-2 px-margin-screen">
        <div className="flex min-w-0 items-center gap-2">
          <BrandMark size="sm" />
          <div className="min-w-0">
            <p className="truncate text-label-sm uppercase tracking-wider text-primary">SplashPass</p>
            <h1 className="truncate text-headline-sm text-on-surface leading-tight">Parent home</h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="flex size-11 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:text-primary"
            aria-label="Notifications"
            disabled
          >
            <MaterialIcon name="notifications" size={24} />
          </button>
          <div className="rounded-full p-0.5 ring-2 ring-primary-fixed" title={parentName}>
            <div
              className="flex size-8 items-center justify-center rounded-full bg-primary-fixed text-[11px] font-bold text-primary"
              aria-hidden
            >
              {parentInitials(parentName)}
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-auto px-1 text-label-sm" onClick={onSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  )
}
