import type { ReactNode } from 'react'
import {
  PARENT_ACCOUNT_PATH,
  PARENT_HOME_PATH,
} from '../../lib/appNavigation'
import { BrandMark } from '../layout/BrandMark'
import { Button, MaterialIcon } from '../ui'
import { DesktopTabNav, MobileTabNav, type TabNavItem } from './ResponsiveTabNav'

const PARENT_TABS: TabNavItem[] = [
  { id: 'swimmers', label: 'Swimmers', icon: 'scuba_diving', href: PARENT_HOME_PATH },
  { id: 'account', label: 'Account', icon: 'account_circle', href: PARENT_ACCOUNT_PATH },
]

interface ParentShellProps {
  children: ReactNode
  activePath: string
  onNavigate: (path: string) => void
  showEnrollCta?: boolean
  onEnroll?: () => void
  screenTitle?: string
}

export function ParentShell({
  children,
  activePath,
  onNavigate,
  showEnrollCta = false,
  onEnroll,
  screenTitle = 'Swimmers',
}: ParentShellProps) {
  const navProps = {
    items: PARENT_TABS,
    activeHref: activePath,
    onNavigate,
    ariaLabel: 'Parent navigation',
  }

  return (
    <div className="flex min-h-svh flex-col bg-surface text-on-surface">
      <header
        className="fixed inset-x-0 top-0 z-50 border-b border-outline-variant/30 bg-surface/90 pt-safe backdrop-blur-xl shadow-[0_1px_12px_rgba(0,100,124,0.06)]"
      >
        <div className="mx-auto flex h-16 w-full max-w-md items-center justify-between gap-3 px-margin-screen md:max-w-4xl">
          <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-5">
            <BrandMark size="sm" className="shrink-0" />
            <DesktopTabNav {...navProps} />
            <h1 className="truncate text-headline-sm text-on-surface md:hidden">{screenTitle}</h1>
          </div>
          {showEnrollCta && onEnroll ? (
            <Button
              type="button"
              size="sm"
              className="h-9 shrink-0 rounded-full px-3 text-label-sm shadow-[0_4px_16px_-2px_rgba(8,145,178,0.25)]"
              onClick={onEnroll}
            >
              <MaterialIcon name="add" size={18} />
              <span className="hidden sm:inline">Enroll child</span>
              <span className="sm:hidden">Enroll</span>
            </Button>
          ) : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-margin-screen pb-24 pt-16 md:max-w-4xl md:pb-8">
        {children}
      </main>

      <MobileTabNav {...navProps} />
    </div>
  )
}
