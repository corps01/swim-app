import { Button } from '../ui'
import { BrandMark } from './BrandMark'

export interface NavbarProps {
  title: string
  subtitle?: string
  onSignOut?: () => void
}

export function Navbar({ title, subtitle, onSignOut }: NavbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-outline-variant/40 bg-surface/90 px-margin-screen pt-safe backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark size="sm" />
          <div className="min-w-0">
            <p className="text-label-sm text-primary uppercase">SplashPass</p>
            <h1 className="text-headline-sm text-on-surface">{title}</h1>
            {subtitle ? (
              <p className="text-body-sm text-on-surface-variant">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {onSignOut ? (
          <Button variant="secondary" size="sm" className="shrink-0" onClick={onSignOut}>
            Sign out
          </Button>
        ) : null}
      </div>
    </header>
  )
}
