import { Link2 } from 'lucide-react'
import { AppLayout } from '../components/layout'
import { useAuth } from '../hooks/useAuth'
import { useInstructorRoster } from '../hooks/useInstructorRoster'
import { PLACEHOLDER_CLASS_LABEL } from '../lib/api/instructors'
import { Badge, Button, Card } from '../components/ui'

interface InstructorHomePageProps {
  onSignOut: () => void
}

function inviteLinkFor(instructorId: string): string {
  const url = new URL(window.location.href)
  url.searchParams.set('invite', instructorId)
  return url.toString()
}

export function InstructorHomePage({ onSignOut }: InstructorHomePageProps) {
  const { user } = useAuth()
  const instructorId = user?.id
  const { roster, loading, error } = useInstructorRoster(instructorId)

  const inviteCode = instructorId ?? ''
  const inviteLink = instructorId ? inviteLinkFor(instructorId) : ''

  return (
    <AppLayout title="Class roster" subtitle="SplashPass" variant="flow" onSignOut={onSignOut}>
      <div className="flex flex-col gap-4">
        <Card>
          <h2 className="text-headline-sm text-on-surface">Share with parents</h2>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Parents join using your invite link or code.
          </p>

          <div className="mt-4 space-y-3">
            <div className="rounded-lg bg-surface-container-low p-3">
              <p className="text-label-sm text-on-surface-variant">Invite link</p>
              <p className="mt-1 break-all text-body-sm text-on-surface">{inviteLink}</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => void navigator.clipboard.writeText(inviteLink)}
            >
              <Link2 className="size-4" aria-hidden />
              Copy invite link
            </Button>

            <div className="rounded-lg bg-surface-container-low p-3">
              <p className="text-label-sm text-on-surface-variant">Class code</p>
              <p className="mt-1 break-all font-mono text-body-sm text-on-surface">{inviteCode}</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => void navigator.clipboard.writeText(inviteCode)}
            >
              Copy class code
            </Button>
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="text-headline-sm text-on-surface">Roster</h2>
            <span className="text-label-sm text-on-surface-variant">{PLACEHOLDER_CLASS_LABEL}</span>
          </div>

          {loading ? (
            <p className="text-body-md text-on-surface-variant">Loading roster…</p>
          ) : error ? (
            <p className="text-body-md text-error">{error}</p>
          ) : roster.length === 0 ? (
            <p className="text-body-md text-on-surface-variant">
              No active swimmers yet. Share your invite link so parents can join.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] text-left text-body-sm">
                <thead>
                  <tr className="border-b border-outline-variant text-label-sm text-on-surface-variant">
                    <th className="py-2 pr-3 font-medium">Name</th>
                    <th className="py-2 pr-3 font-medium">Parent</th>
                    <th className="py-2 pr-3 font-medium">Class</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((row) => (
                    <tr key={row.childId} className="border-b border-outline-variant/60">
                      <td className="py-2.5 pr-3 text-on-surface">
                        {row.firstName} {row.lastName}
                      </td>
                      <td className="py-2.5 pr-3 text-on-surface-variant">{row.parentName}</td>
                      <td className="py-2.5 pr-3 text-on-surface-variant">{row.classLabel}</td>
                      <td className="py-2.5">
                        <Badge tone={row.status === 'active' ? 'success' : 'warning'}>
                          {row.status === 'active' ? 'Active' : row.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  )
}
