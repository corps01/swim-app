import { useCallback, useEffect, useMemo, useState } from 'react'
import { InstructorShell } from '../components/navigation/InstructorShell'
import { InstructorClassCard } from '../components/instructor/InstructorClassCard'
import { useAuth } from '../hooks/useAuth'
import { useInstructorClasses } from '../hooks/useInstructorClasses'
import { useInstructorRoster } from '../hooks/useInstructorRoster'
import { LAST_CREATED_CLASS_STORAGE_KEY } from '../lib/appNavigation'
import type { SwimClass } from '../types/class'
import { InstructorShareInvitePage } from './InstructorShareInvitePage'
import { Button, MaterialIcon } from '../components/ui'

interface InstructorHomePageProps {
  onNavigate: (path: string) => void
  onNewClass: () => void
}

type InstructorScreen = 'home' | 'share'

export function InstructorHomePage({ onNavigate, onNewClass }: InstructorHomePageProps) {
  const [screen, setScreen] = useState<InstructorScreen>('home')
  const [shareClass, setShareClass] = useState<SwimClass | null>(null)
  const [expandedClassIds, setExpandedClassIds] = useState<string[]>([])
  const [toast, setToast] = useState<string | null>(null)

  const { user } = useAuth()
  const instructorId = user?.id
  const instructorName = user?.fullName ?? 'Coach'
  const { classes, loading: classesLoading } = useInstructorClasses(instructorId)
  const { roster: allRoster, loading: rosterLoading, error } = useInstructorRoster()

  const rosterByClass = useMemo(() => {
    const map = new Map<string, typeof allRoster>()
    for (const classRow of classes) {
      map.set(
        classRow.id,
        allRoster.filter((entry) => entry.classId === classRow.id),
      )
    }
    return map
  }, [allRoster, classes])

  const copyClassCode = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setToast('Class code copied!')
    } catch {
      setToast('Could not copy — tap the code and copy manually.')
    }
  }, [])

  useEffect(() => {
    const createdId = sessionStorage.getItem(LAST_CREATED_CLASS_STORAGE_KEY)
    if (!createdId) return

    sessionStorage.removeItem(LAST_CREATED_CLASS_STORAGE_KEY)
    setExpandedClassIds((current) =>
      current.includes(createdId) ? current : [createdId, ...current],
    )

    const created = classes.find((row) => row.id === createdId)
    if (created) {
      void copyClassCode(created.class_code)
    }
  }, [classes, copyClassCode])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  if (screen === 'share' && shareClass) {
    return <InstructorShareInvitePage swimClass={shareClass} onBack={() => setScreen('home')} />
  }

  return (
    <InstructorShell
      activeTab="classes"
      onNavigate={onNavigate}
      instructorName={instructorName}
      showCreateClassCta
      onCreateClass={onNewClass}
    >
      <section className="px-margin-screen pb-stack-tight pt-stack-base">
        <h2 className="text-headline-lg-mobile text-on-surface">Your classes</h2>
        <p className="text-body-md text-on-surface-variant">
          {classesLoading
            ? 'Loading…'
            : classes.length === 0
              ? 'Add a class to get a code for parents'
              : 'Tap a class to view its roster'}
        </p>
      </section>

      {error ? (
        <p className="px-margin-screen pb-2 text-body-md text-error">{error}</p>
      ) : null}

      <section className="flex flex-col gap-3 px-margin-screen">
        {classesLoading || rosterLoading ? (
          <p className="text-body-md text-on-surface-variant">Loading classes…</p>
        ) : classes.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-outline-variant/50 bg-surface-container-lowest p-8 text-center">
            <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-surface-container text-primary">
              <MaterialIcon name="pool" size={32} />
            </div>
            <p className="text-body-md text-on-surface-variant">
              No classes yet. Create a class to generate an invite code for parents.
            </p>
            <Button type="button" className="mt-4 rounded-full" onClick={onNewClass}>
              <MaterialIcon name="add" size={20} />
              + Create Class
            </Button>
          </div>
        ) : (
          classes.map((classRow, index) => (
              <InstructorClassCard
                key={classRow.id}
                classRow={classRow}
                listIndex={index}
                instructorName={instructorName}
                roster={rosterByClass.get(classRow.id) ?? []}
                expanded={expandedClassIds.includes(classRow.id)}
              onToggle={() => {
                setExpandedClassIds((current) =>
                  current.includes(classRow.id)
                    ? current.filter((id) => id !== classRow.id)
                    : [...current, classRow.id],
                )
              }}
              onCopyCode={(code) => void copyClassCode(code)}
              onShare={() => {
                setShareClass(classRow)
                setScreen('share')
              }}
            />
          ))
        )}
      </section>

      {toast ? (
        <div
          className="pointer-events-none fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-on-surface/95 px-4 py-2.5 text-label-sm font-semibold text-surface-container-lowest shadow-lg backdrop-blur md:bottom-8"
          role="status"
        >
          <MaterialIcon name="check_circle" size={16} className="text-secondary-container" filled />
          {toast}
        </div>
      ) : null}
    </InstructorShell>
  )
}
