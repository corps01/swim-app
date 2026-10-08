import { InstructorShell } from '../../components/navigation/InstructorShell'
import { useAuth } from '../../hooks/useAuth'
import { Button, Card, MaterialIcon } from '../../components/ui'

interface InstructorAccountPageProps {
  onNavigate: (path: string) => void
  onSignOut: () => void
}

export function InstructorAccountPage({ onNavigate, onSignOut }: InstructorAccountPageProps) {
  const { user } = useAuth()
  const name = user?.fullName ?? 'Coach'

  return (
    <InstructorShell
      activeTab="account"
      onNavigate={onNavigate}
      instructorName={name}
    >
      <div className="flex flex-col gap-4 px-margin-screen pb-8 pt-2">
        <Card className="flex-row items-center gap-4 rounded-3xl p-5">
          <div
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-secondary-container text-headline-sm font-bold text-on-secondary-container"
            aria-hidden
          >
            {name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="text-headline-md text-on-surface">{name}</h2>
            <p className="mt-1 text-label-sm text-secondary">Instructor account</p>
          </div>
        </Card>

        <Card variant="outline" className="gap-3 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <MaterialIcon name="class" size={20} className="mt-0.5 text-primary" />
            <p className="text-body-sm text-on-surface-variant">
              Use Classes for codes and schedules. Roster searches every swimmer across your
              classes in one place.
            </p>
          </div>
        </Card>

        <Button type="button" variant="secondary" fullWidth className="rounded-2xl" onClick={onSignOut}>
          Sign out
        </Button>
      </div>
    </InstructorShell>
  )
}
