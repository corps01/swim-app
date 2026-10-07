import { Plus } from 'lucide-react'
import { GreetingBanner } from '../components/home/GreetingBanner'
import { HomeHeader } from '../components/home/HomeHeader'
import { PendingFormBanner } from '../components/home/PendingFormBanner'
import { SwimmerCard } from '../components/home/SwimmerCard'
import { useAuth } from '../hooks/useAuth'
import { useParentSwimmers } from '../hooks/useParentSwimmers'
import { Button } from '../components/ui'

interface ParentHomePageProps {
  onSignOut: () => void
  onEnroll: () => void
}

export function ParentHomePage({ onSignOut, onEnroll }: ParentHomePageProps) {
  const { user } = useAuth()
  const { swimmers, loading, error } = useParentSwimmers(user?.id)

  const pending = swimmers.filter((s) => s.formStatus === 'missing')
  const firstPending = pending[0]

  return (
    <div className="flex min-h-svh flex-col bg-surface text-on-surface">
      <HomeHeader onSignOut={onSignOut} />

      <main className="mx-auto w-full max-w-md flex-1 px-margin-screen pt-[calc(4.5rem+env(safe-area-inset-top))] pb-safe">
        <div className="flex flex-col gap-stack-base py-4">
          <GreetingBanner
            parentName={user?.fullName || 'Parent'}
            swimmerCount={swimmers.length}
            pendingForms={pending.length}
          />

          {error ? (
            <p role="alert" className="rounded bg-error-container px-3 py-2 text-body-sm text-on-error-container">
              {error}
            </p>
          ) : null}

          {firstPending ? <PendingFormBanner swimmer={firstPending} /> : null}

          <section className="flex flex-col gap-stack-base">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <h3 className="text-headline-sm text-on-surface">Your swimmers</h3>
                <span
                  className="flex size-5 items-center justify-center rounded-full bg-surface-container-high text-label-sm font-bold text-on-surface-variant"
                >
                  {swimmers.length}
                </span>
              </div>
              <Button variant="ghost" size="sm" className="h-auto px-0" onClick={onEnroll}>
                <Plus className="size-4" aria-hidden />
                Enroll
              </Button>
            </div>

            {loading ? (
              <p className="text-body-md text-on-surface-variant">Loading swimmers…</p>
            ) : swimmers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-outline-variant/50 bg-surface-container-lowest p-6 text-center">
                <p className="text-body-md text-on-surface-variant">
                  No swimmers yet. Add a child and link them with your instructor&apos;s invite ID.
                </p>
                <Button className="mt-4" onClick={onEnroll}>Enroll a swimmer</Button>
              </div>
            ) : (
              swimmers.map((swimmer) => <SwimmerCard key={swimmer.id} swimmer={swimmer} />)
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
