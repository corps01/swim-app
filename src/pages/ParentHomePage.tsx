import { useEffect, useMemo, useState } from 'react'
import { fetchLatestProgressLogsByChildIds, type ProgressLog } from '../lib/api/progressLogs'
import { ParentShell } from '../components/navigation/ParentShell'
import { InstructorInviteCodeBanner } from '../components/home/InstructorInviteCodeBanner'
import { ParentHomeSwimmerCard } from '../components/home/ParentHomeSwimmerCard'
import { useAuth } from '../hooks/useAuth'
import { useParentSwimmers } from '../hooks/useParentSwimmers'
import { normalizeClassCodeInput } from '../lib/classCode'
import { setStoredPendingInviteCode } from '../lib/pendingInvite'
import { parentEnrollPath, parentSwimmerActivityPath, PARENT_HOME_PATH } from '../lib/appNavigation'
import { swimmerHasActiveClass } from '../lib/swimmers'
import { Button, Card, MaterialIcon } from '../components/ui'

interface ParentHomePageProps {
  onNavigate: (path: string) => void
  onEditSwimmer: (childId: string) => void
}

function startEnrollWithInvite(code: string, onNavigate: (path: string) => void) {
  const normalized = normalizeClassCodeInput(code)
  if (!normalized) {
    onNavigate(parentEnrollPath())
    return
  }
  setStoredPendingInviteCode(normalized)
  onNavigate(parentEnrollPath({ inviteCode: normalized }))
}

export function ParentHomePage({ onNavigate, onEditSwimmer }: ParentHomePageProps) {
  const { user } = useAuth()
  const parentId = user?.id
  const { swimmers, loading, error, refresh } = useParentSwimmers(parentId)
  const [inviteCode, setInviteCode] = useState('')
  const [latestByChild, setLatestByChild] = useState<Map<string, ProgressLog>>(new Map())
  const [activityLoading, setActivityLoading] = useState(false)

  useEffect(() => {
    const ids = swimmers.map((row) => row.id)
    if (ids.length === 0) {
      setLatestByChild(new Map())
      setActivityLoading(false)
      return
    }
    let cancelled = false
    setActivityLoading(true)
    void fetchLatestProgressLogsByChildIds(ids)
      .then((map) => {
        if (!cancelled) setLatestByChild(map)
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [swimmers])

  const parentName = user?.fullName || 'Parent'
  const firstName = parentName.split(' ')[0] || 'there'

  const enrolledCount = useMemo(
    () => swimmers.filter((swimmer) => swimmerHasActiveClass(swimmer)).length,
    [swimmers],
  )

  function handleJoinFromBanner() {
    startEnrollWithInvite(inviteCode, onNavigate)
  }

  return (
    <ParentShell
      activePath={PARENT_HOME_PATH}
      onNavigate={onNavigate}
      showEnrollCta
      onEnroll={() => onNavigate(parentEnrollPath())}
      screenTitle="Swimmers"
    >
      <div className="flex flex-col gap-stack-loose pb-8 pt-2">
        <section className="flex flex-col gap-stack-base">
          <div className="min-w-0 flex-col">
            <span className="flex items-center gap-1 text-label-md font-semibold tracking-wide text-primary">
              <MaterialIcon name="waves" size={16} />
              SplashPass family hub
            </span>
            <h2 className="truncate text-headline-lg-mobile text-on-surface">
              Welcome back, {firstName}
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              Class times, locations, and notes for your swimmers
            </p>
          </div>

          <Card variant="outline" className="flex-row items-center justify-between rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary-fixed/50 text-primary">
                <MaterialIcon name="family_restroom" size={20} />
              </div>
              <div>
                <p className="text-headline-sm text-on-surface">{loading ? '—' : swimmers.length}</p>
                <p className="text-label-sm text-on-surface-variant">Swimmers on account</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-headline-sm text-on-surface">{loading ? '—' : enrolledCount}</p>
              <p className="text-label-sm text-on-surface-variant">In a class</p>
            </div>
          </Card>
        </section>

        <InstructorInviteCodeBanner
          value={inviteCode}
          onChange={setInviteCode}
          onJoin={handleJoinFromBanner}
        />

        {error ? (
          <p
            role="alert"
            className="rounded-2xl bg-error-container px-3 py-2 text-body-sm text-on-error-container"
          >
            {error}
          </p>
        ) : null}

        <section className="flex flex-col gap-stack-base">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MaterialIcon name="scuba_diving" size={22} className="text-primary" />
              <h3 className="text-headline-md text-on-surface">Your swimmers</h3>
            </div>
            {!loading && swimmers.length > 0 ? (
              <span className="rounded-full bg-surface-container-high px-2.5 py-1 text-label-sm text-on-surface-variant">
                {swimmers.length} on account
              </span>
            ) : null}
          </div>

          {loading ? (
            <p className="text-body-md text-on-surface-variant">Loading swimmers…</p>
          ) : swimmers.length === 0 ? (
            <Card
              variant="outline"
              className="items-center gap-3 rounded-3xl border-dashed border-outline-variant/50 py-8 text-center shadow-[0_4px_16px_-2px_rgba(0,100,124,0.06)]"
            >
              <div className="flex size-14 items-center justify-center rounded-full bg-primary-fixed/50 text-primary">
                <MaterialIcon name="person_add" size={28} />
              </div>
              <div>
                <h4 className="text-headline-sm text-on-surface">No swimmers yet</h4>
                <p className="mx-auto mt-1 max-w-xs text-body-sm text-on-surface-variant">
                  Add your first child with your instructor&apos;s class code to see schedules here.
                </p>
              </div>
              <Button
                type="button"
                className="rounded-full"
                onClick={() => onNavigate(parentEnrollPath())}
              >
                <MaterialIcon name="add_circle" size={18} />
                Enroll child
              </Button>
            </Card>
          ) : (
            <>
              <ul className="flex flex-col gap-stack-base">
                {swimmers.map((swimmer) => (
                  <li key={swimmer.id}>
                    <ParentHomeSwimmerCard
                      swimmer={swimmer}
                      parentUserId={parentId ?? ''}
                      latestActivity={latestByChild.get(swimmer.id) ?? null}
                      activityLoading={activityLoading}
                      onEnroll={(childId) => onNavigate(parentEnrollPath({ childId }))}
                      onEdit={() => onEditSwimmer(swimmer.id)}
                      onViewActivity={() => onNavigate(parentSwimmerActivityPath(swimmer.id))}
                      onEnrollmentChanged={() => void refresh()}
                    />
                  </li>
                ))}
              </ul>

              <Button
                type="button"
                variant="secondary"
                fullWidth
                className="rounded-2xl"
                onClick={() => onNavigate(parentEnrollPath())}
              >
                <MaterialIcon name="person_add" size={18} />
                Enroll another child
              </Button>
            </>
          )}
        </section>
      </div>
    </ParentShell>
  )
}
