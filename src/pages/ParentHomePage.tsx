import { useState } from 'react'
import { HomeHeader } from '../components/home/HomeHeader'
import { InstructorInviteCodeBanner } from '../components/home/InstructorInviteCodeBanner'
import { ParentHomeSwimmerCard } from '../components/home/ParentHomeSwimmerCard'
import { useAuth } from '../hooks/useAuth'
import { useParentSwimmers } from '../hooks/useParentSwimmers'
import { Button, Card, MaterialIcon } from '../components/ui'

interface ParentHomePageProps {
  onSignOut: () => void
  onEnroll: () => void
}

function startEnrollWithInvite(code: string, onEnroll: () => void) {
  const trimmed = code.trim()
  if (trimmed) {
    const url = new URL(window.location.href)
    url.searchParams.set('invite', trimmed)
    window.history.replaceState({}, '', url.toString())
  }
  onEnroll()
}

export function ParentHomePage({ onSignOut, onEnroll }: ParentHomePageProps) {
  const { user } = useAuth()
  const { swimmers, loading, error } = useParentSwimmers(user?.id)
  const [inviteCode, setInviteCode] = useState('')

  const parentName = user?.fullName || 'Parent'
  const firstName = parentName.split(' ')[0] || 'there'
  const allConfirmed = swimmers.length > 0 && swimmers.every((s) => s.formStatus === 'completed')
  const nextSession = swimmers.find((s) => s.formStatus === 'completed')?.sessionLabel ?? '—'

  function handleJoinFromBanner() {
    startEnrollWithInvite(inviteCode, onEnroll)
  }

  return (
    <div className="flex min-h-svh flex-col bg-surface text-on-surface">
      <HomeHeader onSignOut={onSignOut} parentName={parentName} />

      <main className="mx-auto w-full max-w-md flex-1 px-margin-screen pb-safe pt-16">
        <div className="flex flex-col gap-stack-loose pb-8 pt-2">
          {/* Greeting */}
          <section className="flex flex-col gap-stack-base">
            <div className="flex items-center justify-between gap-stack-base">
              <div className="min-w-0 flex-col">
                <span className="flex items-center gap-1 text-label-md font-semibold tracking-wide text-primary">
                  <MaterialIcon name="waves" size={16} />
                  SplashPass family hub
                </span>
                <h2 className="truncate text-headline-lg-mobile text-on-surface">
                  Welcome back, {firstName}
                </h2>
                <p className="text-body-sm text-on-surface-variant">
                  Your family swimming hub &amp; poolside deck monitor
                </p>
              </div>
              <Button
                type="button"
                size="md"
                className="h-12 shrink-0 rounded-full px-4 shadow-[0_4px_16px_-2px_rgba(8,145,178,0.3)]"
                onClick={() => onEnroll()}
              >
                <MaterialIcon name="add" size={20} />
                Enroll child
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <Card variant="outline" className="items-center gap-1 rounded-2xl p-3 text-center shadow-[0_4px_16px_-2px_rgba(0,100,124,0.06)]">
                <div className="mb-1 flex size-8 items-center justify-center rounded-full bg-primary-fixed/50 text-primary">
                  <MaterialIcon name="family_restroom" size={18} />
                </div>
                <span className="text-headline-sm leading-tight text-on-surface">
                  {loading ? '—' : swimmers.length}
                </span>
                <span className="text-label-sm text-on-surface-variant">Enrolled</span>
              </Card>
              <Card variant="outline" className="items-center gap-1 rounded-2xl p-3 text-center shadow-[0_4px_16px_-2px_rgba(0,100,124,0.06)]">
                <div className="mb-1 flex size-8 items-center justify-center rounded-full bg-secondary-fixed/50 text-secondary">
                  <MaterialIcon name="verified" size={18} filled />
                </div>
                <span className="text-headline-sm leading-tight text-secondary">
                  {allConfirmed ? 'Confirmed' : 'Pending'}
                </span>
                <span className="text-label-sm text-on-surface-variant">All lessons</span>
              </Card>
              <Card variant="outline" className="items-center gap-1 rounded-2xl p-3 text-center shadow-[0_4px_16px_-2px_rgba(0,100,124,0.06)]">
                <div className="mb-1 flex size-8 items-center justify-center rounded-full bg-surface-container-high text-primary">
                  <MaterialIcon name="pool" size={18} />
                </div>
                <span className="truncate text-headline-sm leading-tight text-on-surface">Today</span>
                <span className="truncate text-label-sm text-on-surface-variant">{nextSession}</span>
              </Card>
            </div>
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

          {/* Roster */}
          <section className="flex flex-col gap-stack-base">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MaterialIcon name="scuba_diving" size={22} className="text-primary" />
                <h3 className="text-headline-md text-on-surface">Your swimmers</h3>
              </div>
              {!loading && swimmers.length > 0 ? (
                <span className="rounded-full bg-surface-container-high px-2.5 py-1 text-label-sm text-on-surface-variant">
                  {swimmers.length} registered
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
                  <h4 className="text-headline-sm text-on-surface">No children enrolled yet.</h4>
                  <p className="mx-auto mt-1 max-w-xs text-body-sm text-on-surface-variant">
                    Enter your instructor&apos;s invite code above or enroll a child to get started.
                  </p>
                </div>
                <Button type="button" className="rounded-full" onClick={() => onEnroll()}>
                  <MaterialIcon name="add_circle" size={18} />
                  Enter instructor invite code
                </Button>
              </Card>
            ) : (
              <>
                <ul className="flex flex-col gap-stack-base">
                  {swimmers.map((swimmer) => (
                    <li key={swimmer.id}>
                      <ParentHomeSwimmerCard swimmer={swimmer} onEnroll={onEnroll} />
                    </li>
                  ))}
                </ul>

                <div className="mt-stack-loose">
                  <div className="mb-stack-tight flex items-center justify-between">
                    <span className="text-label-sm uppercase tracking-wider text-on-surface-variant">
                      Need to enroll another child?
                    </span>
                    <span className="text-label-sm font-semibold text-primary">Self-service</span>
                  </div>
                  <button
                    type="button"
                    className="flex w-full flex-col items-center gap-3 rounded-3xl bg-surface-container-lowest/80 p-card-padding text-center shadow-[0_4px_16px_-2px_rgba(0,100,124,0.06)] transition-all active:scale-[0.98] hover:bg-surface-container-lowest"
                    onClick={() => onEnroll()}
                  >
                    <div className="flex size-14 items-center justify-center rounded-full bg-primary-fixed/50 text-primary">
                      <MaterialIcon name="person_add" size={28} />
                    </div>
                    <p className="max-w-xs text-body-sm text-on-surface-variant">
                      Add a sibling or join another class with your instructor&apos;s invite code.
                    </p>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-label-md text-on-primary shadow-sm">
                      <MaterialIcon name="add_circle" size={18} />
                      Enroll another child
                    </span>
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
