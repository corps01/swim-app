import { useEffect, useMemo, useState } from 'react'
import { InstructorShell } from '../../components/navigation/InstructorShell'
import { InstructorClassCard } from '../../components/instructor/InstructorClassCard'
import { useAuth } from '../../hooks/useAuth'
import { useInstructorClasses } from '../../hooks/useInstructorClasses'
import { useInstructorSwimmers } from '../../hooks/useInstructorSwimmers'
import { fetchClassSeasonRanges, type ClassSeasonRange } from '../../lib/api/classSchedule'
import { instructorClassDetailPath } from '../../lib/appNavigation'
import { Button, MaterialIcon } from '../../components/ui'

interface InstructorClassesPageProps {
  onNavigate: (path: string) => void
  onNewClass: () => void
}

export function InstructorClassesPage({ onNavigate, onNewClass }: InstructorClassesPageProps) {
  const { user } = useAuth()
  const instructorId = user?.id
  const instructorName = user?.fullName ?? 'Coach'
  const { classes, loading: classesLoading } = useInstructorClasses(instructorId)
  const { swimmers: allSwimmers, loading: swimmersLoading, error } = useInstructorSwimmers()
  const [seasonByClassId, setSeasonByClassId] = useState<Map<string, ClassSeasonRange>>(new Map())

  useEffect(() => {
    if (classes.length === 0) {
      setSeasonByClassId(new Map())
      return
    }
    let cancelled = false
    void fetchClassSeasonRanges(classes.map((row) => row.id))
      .then((ranges) => {
        if (!cancelled) setSeasonByClassId(ranges)
      })
      .catch(() => {
        if (!cancelled) setSeasonByClassId(new Map())
      })
    return () => {
      cancelled = true
    }
  }, [classes])

  const swimmerCountByClass = useMemo(() => {
    const map = new Map<string, number>()
    for (const classRow of classes) {
      map.set(classRow.id, 0)
    }
    for (const entry of allSwimmers) {
      if (entry.classId) {
        map.set(entry.classId, (map.get(entry.classId) ?? 0) + 1)
      }
    }
    return map
  }, [allSwimmers, classes])

  return (
    <InstructorShell
      activeTab="classes"
      onNavigate={onNavigate}
      instructorName={instructorName}
      showCreateClassCta
      onCreateClass={onNewClass}
      wideContent
    >
      <section className="flex flex-col gap-3 px-margin-screen pb-stack-tight pt-stack-base sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-headline-lg-mobile text-on-surface">Classes &amp; invites</h2>
          <p className="text-body-md text-on-surface-variant">
            {classesLoading
              ? 'Loading…'
              : classes.length === 0
                ? 'Add a class to get a code for parents'
                : 'Open a class to share its code, edit the schedule, or assign a form'}
          </p>
        </div>
      </section>

      {error ? (
        <p className="px-margin-screen pb-2 text-body-md text-error">{error}</p>
      ) : null}

      <section className="grid grid-cols-1 gap-3 px-margin-screen md:grid-cols-2 md:gap-4">
        {classesLoading || swimmersLoading ? (
          <p className="col-span-full text-body-md text-on-surface-variant">Loading classes…</p>
        ) : classes.length === 0 ? (
          <div className="col-span-full rounded-3xl border border-dashed border-outline-variant/50 bg-surface-container-lowest p-8 text-center">
            <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-surface-container text-primary">
              <MaterialIcon name="pool" size={32} />
            </div>
            <p className="text-body-md text-on-surface-variant">
              No classes yet. Create a class to generate an invite code for parents.
            </p>
            <Button type="button" className="mt-4 rounded-full" onClick={onNewClass}>
              <MaterialIcon name="add" size={20} />
              Create Class
            </Button>
          </div>
        ) : (
          classes.map((classRow, index) => (
            <InstructorClassCard
              key={classRow.id}
              classRow={classRow}
              listIndex={index}
              instructorName={instructorName}
              swimmerCount={swimmerCountByClass.get(classRow.id) ?? 0}
              hasScheduleRules={seasonByClassId.has(classRow.id)}
              seasonStart={seasonByClassId.get(classRow.id)?.seasonStart ?? null}
              seasonEnd={seasonByClassId.get(classRow.id)?.seasonEnd ?? null}
              onOpenDetails={() => onNavigate(instructorClassDetailPath(classRow.id, { from: 'classes' }))}
            />
          ))
        )}
      </section>
    </InstructorShell>
  )
}
