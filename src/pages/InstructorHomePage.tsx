import { useMemo, useState } from 'react'
import { InstructorBottomNav } from '../components/instructor/InstructorBottomNav'
import { InstructorHomeHeader } from '../components/instructor/InstructorHomeHeader'
import {
  InstructorRosterToolbar,
  type RosterFilter,
} from '../components/instructor/InstructorRosterToolbar'
import {
  RosterStudentCard,
  rosterDisplayStatus,
  type RosterCardStatus,
} from '../components/instructor/RosterStudentCard'
import { useAuth } from '../hooks/useAuth'
import { useInstructorRoster } from '../hooks/useInstructorRoster'
import { PLACEHOLDER_CLASS_LABEL } from '../lib/api/instructors'
import { InstructorShareInvitePage } from './InstructorShareInvitePage'
import { Button, MaterialIcon } from '../components/ui'

interface InstructorHomePageProps {
  onSignOut: () => void
}

type InstructorScreen = 'home' | 'share'

function matchesFilter(status: RosterCardStatus, filter: RosterFilter): boolean {
  if (filter === 'all') return true
  return status === filter
}

export function InstructorHomePage({ onSignOut }: InstructorHomePageProps) {
  const [screen, setScreen] = useState<InstructorScreen>('home')
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<RosterFilter>('all')

  const { user } = useAuth()
  const instructorId = user?.id
  const { roster, loading, error } = useInstructorRoster(instructorId)

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
      const haystack = `${entry.firstName} ${entry.lastName} ${entry.parentName}`.toLowerCase()
      const matchesQuery = !query || haystack.includes(query)
      const matchesStatus = matchesFilter(displayStatus, activeFilter)
      return matchesQuery && matchesStatus
    })
  }, [enriched, search, activeFilter])

  if (screen === 'share') {
    return <InstructorShareInvitePage onBack={() => setScreen('home')} />
  }

  const instructorName = user?.fullName ?? 'Coach'

  function resetFilters() {
    setSearch('')
    setActiveFilter('all')
  }

  return (
    <div className="flex min-h-svh flex-col bg-surface text-on-surface">
      <InstructorHomeHeader
        instructorName={instructorName}
        onShare={() => setScreen('share')}
        onSignOut={onSignOut}
      />

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col pt-16 pb-28">
        <section className="px-margin-screen pb-stack-tight pt-stack-base">
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-headline-lg-mobile text-on-surface">Assigned roster</h2>
              <p className="text-body-md text-on-surface-variant">
                {loading
                  ? 'Loading students…'
                  : `${counts.all} active student${counts.all === 1 ? '' : 's'} · ${PLACEHOLDER_CLASS_LABEL}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1 rounded-full bg-surface-container-high px-3 py-1">
              <span className="size-2 animate-pulse rounded-full bg-secondary" aria-hidden />
              <span className="text-label-sm text-on-surface">Pool deck</span>
            </div>
          </div>
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
              <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-surface-container text-primary">
                <MaterialIcon name="pool" size={32} />
              </div>
              <p className="text-body-md text-on-surface-variant">
                No active swimmers yet. Share your invite link so parents can join.
              </p>
              <Button type="button" className="mt-4 rounded-full" onClick={() => setScreen('share')}>
                Share class invite
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="mb-3 flex size-16 items-center justify-center rounded-full bg-surface-container text-primary">
                <MaterialIcon name="pool" size={32} />
              </div>
              <h4 className="text-headline-sm text-on-surface">No swimmers found</h4>
              <p className="mt-1 max-w-xs text-body-sm text-on-surface-variant">
                Check spelling or clear active filters to see all {counts.all} students on your roster.
              </p>
              <Button type="button" variant="secondary" className="mt-4 rounded-full" onClick={resetFilters}>
                Reset all filters
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
      </main>

      <InstructorBottomNav />
    </div>
  )
}
