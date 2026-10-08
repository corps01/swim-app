import { ParentShell } from '../../components/navigation/ParentShell'
import { useAuth } from '../../hooks/useAuth'
import { PARENT_ACCOUNT_PATH } from '../../lib/appNavigation'
import { Button, Card, MaterialIcon } from '../../components/ui'

interface ParentAccountPageProps {
  onNavigate: (path: string) => void
  onSignOut: () => void
}

export function ParentAccountPage({ onNavigate, onSignOut }: ParentAccountPageProps) {
  const { user } = useAuth()
  const name = user?.fullName ?? 'Parent'
  return (
    <ParentShell
      activePath={PARENT_ACCOUNT_PATH}
      onNavigate={onNavigate}
      screenTitle="Account"
    >
      <div className="flex flex-col gap-4 pb-8 pt-2">
        <Card className="flex-row items-center gap-4 rounded-3xl p-5">
          <div
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-headline-sm font-bold text-primary"
            aria-hidden
          >
            {name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="text-headline-md text-on-surface">{name}</h2>
            <p className="text-label-sm text-primary">Parent account</p>
          </div>
        </Card>

        <Card variant="outline" className="gap-3 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <MaterialIcon name="info" size={20} className="mt-0.5 text-primary" />
            <p className="text-body-sm text-on-surface-variant">
              Use the Swimmers tab to see class times, locations, and notes. Enrollment is available
              from the swimmers screen when you need it.
            </p>
          </div>
        </Card>

        <Button type="button" variant="secondary" fullWidth className="rounded-2xl" onClick={onSignOut}>
          Sign out
        </Button>
      </div>
    </ParentShell>
  )
}
