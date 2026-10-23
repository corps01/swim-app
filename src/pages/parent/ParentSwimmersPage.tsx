import { useEffect, useState } from 'react'
import { consumeQuestionnaireSigned } from '../../lib/questionnaireNotice'
import { ParentShell } from '../../components/navigation/ParentShell'
import { ParentHomeSwimmerCard } from '../../components/home/ParentHomeSwimmerCard'
import { useAuth } from '../../hooks/useAuth'
import { useParentSwimmers } from '../../hooks/useParentSwimmers'
import {
  parentEnrollPath,
  parentSwimmerClassPath,
  parentSwimmerPath,
  PARENT_SWIMMERS_PATH,
} from '../../lib/appNavigation'
import { Button, Card, MaterialIcon } from '../../components/ui'

interface ParentSwimmersPageProps {
  onNavigate: (path: string) => void
}

export function ParentSwimmersPage({ onNavigate }: ParentSwimmersPageProps) {
  const { user } = useAuth()
  const parentId = user?.id
  const { swimmers, loading, error } = useParentSwimmers(parentId)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!consumeQuestionnaireSigned()) return
    setToast('Questionnaire signed.')
  }, [])

  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (!hash || loading) return
    document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [loading, swimmers])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  return (
    <ParentShell
      activePath={PARENT_SWIMMERS_PATH}
      onNavigate={onNavigate}
      showEnrollCta
      onEnroll={() => onNavigate(parentEnrollPath())}
      screenTitle="Swimmers"
    >
      <div className="flex flex-col gap-stack-loose pb-8 pt-2">
        <section>
          <h2 className="text-headline-lg-mobile text-on-surface">Your swimmers</h2>
          <p className="text-body-sm text-on-surface-variant">
            Profiles and progress. Class codes and schedules live on the Classes tab.
          </p>
        </section>

        {error ? (
          <p role="alert" className="rounded-2xl bg-error-container px-3 py-2 text-body-sm text-on-error-container">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-body-md text-on-surface-variant">Loading swimmers…</p>
        ) : swimmers.length === 0 ? (
          <Card variant="outline" className="items-center gap-3 rounded-3xl border-dashed py-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary-fixed/50 text-primary">
              <MaterialIcon name="person_add" size={28} />
            </div>
            <div>
              <h3 className="text-headline-sm text-on-surface">No swimmers yet</h3>
              <p className="mx-auto mt-1 max-w-xs text-body-sm text-on-surface-variant">
                Add your first child with your instructor’s class code.
              </p>
            </div>
            <Button type="button" className="rounded-full" onClick={() => onNavigate(parentEnrollPath())}>
              <MaterialIcon name="add_circle" size={18} />
              Enroll child
            </Button>
          </Card>
        ) : (
          <ul className="grid grid-cols-1 gap-stack-base lg:grid-cols-2">
            {swimmers.map((swimmer) => (
              <li key={swimmer.id} className="min-w-0">
                <ParentHomeSwimmerCard
                  swimmer={swimmer}
                  onEnroll={(childId) => onNavigate(parentEnrollPath({ childId }))}
                  onOpenClass={(classId) =>
                    onNavigate(parentSwimmerClassPath(swimmer.id, classId, { from: PARENT_SWIMMERS_PATH }))
                  }
                  onViewActivity={() => onNavigate(parentSwimmerPath(swimmer.id))}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {toast ? (
        <div
          className="pointer-events-none fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-on-surface/95 px-4 py-2.5 text-label-sm font-semibold text-surface-container-lowest shadow-lg backdrop-blur md:bottom-8"
          role="status"
        >
          <MaterialIcon name="check_circle" size={16} className="text-secondary-container" filled />
          {toast}
        </div>
      ) : null}
    </ParentShell>
  )
}
