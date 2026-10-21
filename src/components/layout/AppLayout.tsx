import type { ReactNode } from 'react'
import { Navbar } from './Navbar'

export interface AppLayoutProps {
  children: ReactNode
  title?: string
  subtitle?: string
  onBack?: () => void
  backLabel?: string
  wide?: boolean
  onSignOut?: () => void
  variant?: 'auth' | 'flow'
}

export function AppLayout({
  children,
  title = 'SplashPass',
  subtitle,
  onBack,
  backLabel,
  wide = false,
  onSignOut,
  variant = 'flow',
}: AppLayoutProps) {
  const content = (
    <div
      className={
        variant === 'auth'
          ? 'relative mx-auto my-auto w-full max-w-md py-8'
          : `mx-auto w-full py-6 ${wide ? 'max-w-4xl' : 'max-w-md'}`
      }
    >
      <div className="relative">{children}</div>
    </div>
  )

  if (variant === 'auth') {
    return (
      <div className="flex min-h-svh flex-col overflow-x-hidden bg-surface px-margin-screen pt-safe pb-safe text-on-surface">
        {content}
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col bg-surface text-on-surface">
      <Navbar
        title={title}
        subtitle={subtitle}
        onBack={onBack}
        backLabel={backLabel}
        wide={wide}
        onSignOut={onSignOut}
      />
      <main className="flex-1 px-margin-screen pb-safe">{content}</main>
    </div>
  )
}
