import { useEffect, useMemo, useState } from 'react'
import { InstructorShell } from '../../components/navigation/InstructorShell'
import {
  InstructorSwimmersToolbar,
  type SwimmerListFilter,
} from '../../components/instructor/InstructorSwimmersToolbar'
import {
  InstructorSwimmerCard,
  swimmerFormDisplayStatus,
  type SwimmerFormStatus,
} from '../../components/instructor/InstructorSwimmerCard'
import { useAuth } from '../../hooks/useAuth'
import { useAppPath } from '../../hooks/useAppPath'
import { useInstructorClasses } from '../../hooks/useInstructorClasses'
import { useInstructorSwimmers } from '../../hooks/useInstructorSwimmers'
import {
  INSTRUCTOR_SWIMMERS_PATH,
  instructorProgressLogPath,
  instructorSwimmersPath,
  parseInstructorSwimmersClassId,
} from '../../lib/appNavigation'
import { Button, MaterialIcon } from '../../components/ui'

interface InstructorSwimmersPageProps {
  onNavigate: (path: string) => void
}

function matchesFilter(status: SwimmerFormStatus, filter: SwimmerListFilter): boolean {
  if (filter === 'all') return true
  return status === filter
}

export function InstructorSwimmersPage({ onNavigate }: InstructorSwimmersPageProps) {
  const { search: locationSearch } = useAppPath()
  const classIdFromUrl = parseInstructorSwimmersClassId(locationSearch)

  const { user } = useAuth()
  const instructorId = user?.id
  const instructorName = user?.fullName ?? 'Coach'
  const { classes } = useInstructorClasses(instructorId)
  const { swimmers, loading, error } = useInstructorSwimmers(classIdFromUrl ?? undefined)

  const filteredClass = useMemo(
    () => (classIdFromUrl ? classes.find((row) => row.id === classIdFromUrl) : null),
    [classIdFromUrl, classes],
  )

  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<SwimmerListFilter>('all')

  useEffect(() => {
    setSearch('')
    setActiveFilter('all')
  }, [classIdFromUrl])

  const enriched = useMemo(
    () =>
      swimmers.map((entry) => ({
        entry,
        displayStatus: swimmerFormDisplayStatus(entry.status),
      })),
    [swimmers],
  )

  const counts = useMemo(
    () => ({
      all: enriched.length,
      missing: enriched.filter((r) => r.displayStatus === 'missing').length,
      issues: enriched.filter((r) => r.displayStatus === 'issues').length,
      completed: enriched.filter((r) => r.displayStatus === 'completed').length,
    }),
    [enriched],
  )

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return enriched.filter(({ entry, displayStatus }) => {
      const haystack =
        `${entry.firstName} ${entry.lastName} ${entry.parentName} ${entry.classLabel}`.toLowerCase()
      const matchesQuery = !query || haystack.includes(query)
      const matchesStatus = matchesFilter(displayStatus, activeFilter)
      return matchesQuery && matchesStatus
    })
  }, [enriched, search, activeFilter])

  function resetFilters() {
    setSearch('')
    setActiveFilter('all')
  }

  const heading = filteredClass ? filteredClass.name : 'All swimmers'
  const subheading = loading
    ? 'Loading swimmers…'
    : filteredClass
      ? `${counts.all} swimmer${counts.all === 1 ? '' : 's'} in this class`
      : `${counts.all} active across your classes`

  return (
    <InstructorShell activeTab="swimmers" onNavigate={onNavigate} instructorName={instructorName}>
      {classIdFromUrl && filteredClass ? (
        <div
          className="mx-margin-screen mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary/20 bg-primary-fixed/25 px-4 py-3"
          role="status"
        >
          <p className="text-body-sm text-on-surface">
            Showing: <span className="font-bold text-primary">{filteredClass.name}</span>
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0 rounded-full"
            onClick={() => onNavigate(INSTRUCTOR_SWIMMERS_PATH)}
          >
            Show all
          </Button>
        </div>
      ) : null}

      <section className="px-margin-screen pb-stack-tight pt-stack-base">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-headline-lg-mobile text-on-surface">{heading}</h2>
            <p className="text-body-md text-on-surface-variant">{subheading}</p>
          </div>
        </div>
        {classIdFromUrl && !loading && !filteredClass && classes.length > 0 ? (
          <p className="mt-2 text-body-sm text-on-surface-variant">
            That class wasn&apos;t found — showing swimmers from your account.
            <button
              type="button"
              className="ml-1 font-semibold text-primary underline"
              onClick={() => onNavigate(instructorSwimmersPath())}
            >
              Clear filter
            </button>
          </p>
        ) : null}
      </section>

      <div className="px-margin-screen">
        <InstructorSwimmersToolbar
          search={search}
          onSearchChange={setSearch}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          counts={counts}
        />
      </div>

      {error ? (
        <p className="px-margin-screen pt-3 text-body-md text-error">{error}</p>
      ) : null}

      <section className="flex flex-col gap-3 px-margin-screen pt-stack-tight">
        {loading ? (
          <p className="text-body-md text-on-surface-variant">Loading swimmers…</p>
        ) : counts.all === 0 ? (
          <div className="rounded-3xl border border-dashed border-outline-variant/50 bg-surface-container-lowest p-8 text-center">
            <MaterialIcon name="groups" size={32} className="mx-auto mb-3 text-primary" />
            <p className="text-body-md text-on-surface-variant">
              {filteredClass
                ? 'No swimmers in this class yet. Share your class code so parents can enroll.'
                : 'No swimmers yet. Share a class code so parents can enroll.'}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <MaterialIcon name="search_off" size={32} className="mb-3 text-primary" />
            <h4 className="text-headline-sm text-on-surface">No swimmers found</h4>
            <p className="mt-1 max-w-xs text-body-sm text-on-surface-variant">
              Clear filters to see all {counts.all} swimmers.
            </p>
            <Button type="button" variant="secondary" className="mt-4 rounded-full" onClick={resetFilters}>
              Reset filters
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {filtered.map(({ entry, displayStatus }) => (
              <li key={entry.childId}>
                <InstructorSwimmerCard
                  entry={entry}
                  displayStatus={displayStatus}
                  onLogProgress={() =>
                    onNavigate(
                      instructorProgressLogPath({
                        childId: entry.childId,
                        classId: entry.classId ?? classIdFromUrl,
                        from: 'swimmers',
                      }),
                    )
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </InstructorShell>
  )
}
