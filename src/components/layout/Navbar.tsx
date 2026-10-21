import { ChevronLeft } from 'lucide-react'
import { Button } from '../ui'
import { BrandMark } from './BrandMark'

export interface NavbarProps {
  title: string
  subtitle?: string
  onBack?: () => void
  backLabel?: string
  wide?: boolean
  onSignOut?: () => void
}

export function Navbar({ title, subtitle, onBack, backLabel, wide = false, onSignOut }: NavbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-outline-variant/40 bg-surface/90 px-margin-screen pt-safe backdrop-blur-md print:hidden">
      <div className={`mx-auto flex w-full items-center justify-between gap-4 py-3 ${wide ? 'max-w-4xl' : 'max-w-md'}`}>
        <div className="flex min-w-0 items-center gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className={
                backLabel
                  ? 'inline-flex h-11 shrink-0 items-center gap-1 rounded-full bg-surface-container-low px-3 text-label-md text-on-surface transition-colors active:scale-[0.97] hover:bg-surface-container'
                  : 'flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-on-surface transition-colors active:scale-[0.97] hover:bg-surface-container'
              }
            >
              {backLabel ? (
                <span>{backLabel}</span>
              ) : (
                <ChevronLeft className="size-5" strokeWidth={2.5} aria-hidden />
              )}
            </button>
          ) : (
            <BrandMark size="sm" />
          )}
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
