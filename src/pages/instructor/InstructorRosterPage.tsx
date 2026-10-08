import { useMemo, useState } from 'react'
import { InstructorShell } from '../../components/navigation/InstructorShell'
import {
  InstructorRosterToolbar,
  type RosterFilter,
} from '../../components/instructor/InstructorRosterToolbar'
import {
  RosterStudentCard,
  rosterDisplayStatus,
  type RosterCardStatus,
} from '../../components/instructor/RosterStudentCard'
import { useAuth } from '../../hooks/useAuth'
import { useInstructorRoster } from '../../hooks/useInstructorRoster'
import { Button, MaterialIcon } from '../../components/ui'

interface InstructorRosterPageProps {
  onNavigate: (path: string) => void
}

function matchesFilter(status: RosterCardStatus, filter: RosterFilter): boolean {
  if (filter === 'all') return true
  return status === filter
}

export function InstructorRosterPage({ onNavigate }: InstructorRosterPageProps) {
  const { user } = useAuth()
  const instructorName = user?.fullName ?? 'Coach'
  const { roster, loading, error } = useInstructorRoster()

  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<RosterFilter>('all')

  const enriched = useMemo(
    () =>
      roster.map((entry) => ({
        entry,
        displayStatus: rosterDisplayStatus(entry.status),
      })),
    [roster],
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

  return (
    <InstructorShell activeTab="roster" onNavigate={onNavigate} instructorName={instructorName}>
      <section className="px-margin-screen pb-stack-tight pt-stack-base">
        <h2 className="text-headline-lg-mobile text-on-surface">All students</h2>
        <p className="text-body-md text-on-surface-variant">
          {loading ? 'Loading roster…' : `${counts.all} active across your classes`}
        </p>
      </section>

      <div className="px-margin-screen">
        <InstructorRosterToolbar
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
          <p className="text-body-md text-on-surface-variant">Loading roster…</p>
        ) : counts.all === 0 ? (
          <div className="rounded-3xl border border-dashed border-outline-variant/50 bg-surface-container-lowest p-8 text-center">
            <MaterialIcon name="groups" size={32} className="mx-auto mb-3 text-primary" />
            <p className="text-body-md text-on-surface-variant">
              No swimmers yet. Share a class code so parents can enroll.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <MaterialIcon name="search_off" size={32} className="mb-3 text-primary" />
            <h4 className="text-headline-sm text-on-surface">No swimmers found</h4>
            <p className="mt-1 max-w-xs text-body-sm text-on-surface-variant">
              Clear filters to see all {counts.all} students.
            </p>
            <Button type="button" variant="secondary" className="mt-4 rounded-full" onClick={resetFilters}>
              Reset filters
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {filtered.map(({ entry, displayStatus }) => (
              <li key={entry.childId}>
                <RosterStudentCard entry={entry} displayStatus={displayStatus} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </InstructorShell>
  )
}
