import type { ReactNode } from 'react'
import {
  INSTRUCTOR_ACCOUNT_PATH,
  INSTRUCTOR_CLASSES_PATH,
  INSTRUCTOR_HOME_PATH,
  INSTRUCTOR_SWIMMERS_PATH,
  type InstructorTab,
  instructorPathForTab,
} from '../../lib/appNavigation'
import { BrandMark } from '../layout/BrandMark'
import { Button, MaterialIcon } from '../ui'
import { DesktopTabNav, MobileTabNav, type TabNavItem } from './ResponsiveTabNav'

const INSTRUCTOR_TABS: TabNavItem[] = [
  { id: 'agenda', label: 'Today', icon: 'event_available', href: INSTRUCTOR_HOME_PATH },
  { id: 'classes', label: 'Classes', icon: 'class', href: INSTRUCTOR_CLASSES_PATH },
  { id: 'swimmers', label: 'Swimmers', icon: 'group', href: INSTRUCTOR_SWIMMERS_PATH },
  { id: 'account', label: 'Account', icon: 'account_circle', href: INSTRUCTOR_ACCOUNT_PATH },
]

function activePathForTab(tab: InstructorTab): string {
  return instructorPathForTab(tab)
}

interface InstructorShellProps {
  children: ReactNode
  activeTab: InstructorTab
  onNavigate: (path: string) => void
  instructorName: string
  showCreateClassCta?: boolean
  onCreateClass?: () => void
  /** Wider main column for two-column card grids (e.g. Classes). */
  wideContent?: boolean
}

export function InstructorShell({
  children,
  activeTab,
  onNavigate,
  instructorName,
  showCreateClassCta = false,
  onCreateClass,
  wideContent = false,
}: InstructorShellProps) {
  const activePath = activePathForTab(activeTab)
  const navProps = {
    items: INSTRUCTOR_TABS,
    activeHref: activePath,
    onNavigate,
    ariaLabel: 'Coach navigation',
  }

  const mobileTitle =
    activeTab === 'agenda'
      ? 'Your day'
      : activeTab === 'classes'
        ? 'Classes'
        : activeTab === 'swimmers'
          ? 'Swimmers'
          : 'Account'

  return (
    <div className="flex min-h-svh flex-col bg-surface text-on-surface">
      <header
        className="fixed inset-x-0 top-0 z-50 bg-surface/85 pt-safe shadow-[0_1px_8px_rgba(0,100,124,0.06)] backdrop-blur-xl"
      >
        <div
          className={`mx-auto flex h-16 w-full max-w-md items-center justify-between gap-2 px-margin-screen ${wideContent ? 'md:max-w-6xl' : 'md:max-w-4xl'}`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-5">
            <BrandMark size="sm" className="shrink-0" />
            <DesktopTabNav {...navProps} />
            <div className="min-w-0 md:hidden">
              <span className="text-label-sm uppercase tracking-wider text-primary">Coach</span>
              <h1 className="truncate text-headline-sm leading-tight">{mobileTitle}</h1>
            </div>
          </div>
          {showCreateClassCta && onCreateClass ? (
            <Button
              type="button"
              size="sm"
              className="h-9 shrink-0 rounded-full px-3 text-label-sm"
              onClick={onCreateClass}
            >
              <MaterialIcon name="add" size={18} />
              <span className="hidden sm:inline">Create Class</span>
              <span className="sm:hidden">New</span>
            </Button>
          ) : (
            <span
              className="hidden size-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-[11px] font-bold text-primary md:flex"
              title={instructorName}
              aria-hidden
            >
              {instructorName.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
      </header>

      <main
        className={`mx-auto flex w-full max-w-md flex-1 flex-col pb-24 pt-16 md:pb-8 ${wideContent ? 'md:max-w-6xl' : 'md:max-w-4xl'}`}
      >
        {children}
      </main>

      <MobileTabNav {...navProps} />
    </div>
  )
}
