import { BrandMark } from '../layout/BrandMark'
import { MaterialIcon } from '../ui'

interface InstructorHomeHeaderProps {
  instructorName: string
  onShare: () => void
  onSignOut: () => void
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'CP'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export function InstructorHomeHeader({ instructorName, onShare, onSignOut }: InstructorHomeHeaderProps) {
  return (
    <header
      className="fixed inset-x-0 top-0 z-50 bg-surface/85 pt-safe shadow-[0_1px_8px_rgba(0,100,124,0.06)] backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 max-w-md items-center justify-between px-margin-screen">
        <div className="flex min-w-0 items-center gap-2">
          <BrandMark size="sm" />
          <div className="min-w-0 flex-col">
            <span className="text-label-sm uppercase tracking-wider text-primary">SplashPass coach</span>
            <h1 className="text-headline-sm leading-tight text-on-surface">Students</h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onShare}
            aria-label="Share class invite"
            className="flex size-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
          >
            <MaterialIcon name="ios_share" size={22} />
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="rounded-full p-0.5 ring-2 ring-primary-fixed"
            aria-label={`${instructorName}, sign out`}
            title="Sign out"
          >
            <div
              className="flex size-8 items-center justify-center rounded-full bg-primary-fixed text-[11px] font-bold text-primary shadow-[0_2px_8px_rgba(0,100,124,0.12)]"
            >
              {initials(instructorName)}
            </div>
          </button>
        </div>
      </div>
    </header>
  )
}
