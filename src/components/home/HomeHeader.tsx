import { BrandMark } from '../layout/BrandMark'
import { Button } from '../ui'

interface HomeHeaderProps {
  onSignOut: () => void
}

export function HomeHeader({ onSignOut }: HomeHeaderProps) {
  return (
    <header
      className="fixed inset-x-0 top-0 z-50 border-b border-outline-variant/30 bg-surface/85 pt-safe backdrop-blur-xl shadow-[0_1px_12px_rgba(0,100,124,0.06)]"
    >
      <div className="mx-auto flex h-[4.5rem] max-w-md items-center justify-between gap-3 px-margin-screen">
        <div className="flex min-w-0 items-center gap-2">
          <BrandMark size="sm" />
          <div className="min-w-0">
            <p className="text-headline-sm text-primary leading-tight">SplashPass</p>
            <p className="text-label-sm text-on-surface-variant">Family home</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" className="shrink-0" onClick={onSignOut}>
          Sign out
        </Button>
      </div>
    </header>
  )
}
