import { useMemo, useState } from 'react'
import { ClassContextBanner, ClassDetailRows } from '../home/ClassContextBanner'
import type { InstructorRosterEntry } from '../../lib/api/instructorRoster'
import { accentForClass, CLASS_ACCENT_STYLES } from '../../lib/classAccent'
import { formatClassCodeDisplay } from '../../lib/instructorInvite'
import type { SwimClass } from '../../types/class'
import {
  RosterStudentCard,
  rosterDisplayStatus,
  type RosterCardStatus,
} from './RosterStudentCard'
import {
  InstructorRosterToolbar,
  type RosterFilter,
} from './InstructorRosterToolbar'
import { Button, MaterialIcon } from '../ui'
import { cn } from '../../lib/cn'

interface InstructorClassCardProps {
  classRow: SwimClass
  roster: InstructorRosterEntry[]
  expanded: boolean
  listIndex?: number
  instructorName?: string
  onToggle: () => void
  onCopyCode: (code: string) => void
  onShare?: () => void
}

function matchesFilter(status: RosterCardStatus, filter: RosterFilter): boolean {
  if (filter === 'all') return true
  return status === filter
}

export function InstructorClassCard({
  classRow,
  roster,
  expanded,
  listIndex = 0,
  instructorName = 'Coach',
  onToggle,
  onCopyCode,
  onShare,
}: InstructorClassCardProps) {
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<RosterFilter>('all')

  const accent = accentForClass(classRow.id, listIndex)
  const accentStyle = CLASS_ACCENT_STYLES[accent]

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

  const codeLabel = formatClassCodeDisplay(classRow.class_code)
  const scheduleLine = classRow.schedule_details?.trim()
  const subtitle = [
    `${counts.all} swimmer${counts.all === 1 ? '' : 's'}`,
    scheduleLine,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <article
      className={cn(
        'overflow-hidden rounded-3xl border bg-surface-container-lowest shadow-[0_4px_16px_-2px_rgba(0,100,124,0.06)] transition-colors',
        expanded ? 'border-outline-variant/40' : 'border-outline-variant/30',
      )}
    >
      <button
        type="button"
        className="block w-full text-left"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <ClassContextBanner
          accent={accent}
          title={classRow.name}
          pill={codeLabel}
          subtitle={subtitle}
          className="rounded-none shadow-none"
          aside={
            <div className="flex flex-col items-end gap-1">
              <span className="rounded-lg border border-white/25 bg-white/15 px-2 py-1 text-center backdrop-blur-sm">
                <span className="block text-[10px] font-semibold uppercase tracking-tight text-white/90">
                  Roster
                </span>
                <span className="text-headline-sm font-extrabold text-white">{counts.all}</span>
              </span>
              <MaterialIcon
                name={expanded ? 'expand_less' : 'expand_more'}
                size={24}
                className="text-white/90"
              />
            </div>
          }
        >
          <ClassDetailRows
            accent={accent}
            schedule={scheduleLine || 'Schedule not set'}
            location={classRow.location?.trim() || 'Location not set'}
            instructor={instructorName}
          />
        </ClassContextBanner>
      </button>

      <div className="flex flex-wrap items-center gap-2 border-t border-outline-variant/15 px-4 py-3">
        <button
          type="button"
          onClick={() => onCopyCode(classRow.class_code)}
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-label-md font-bold tracking-wider transition-colors active:scale-[0.98]',
            accentStyle.detailIconClass,
            'border-current/30 bg-surface-container-low hover:bg-surface-container',
          )}
        >
          <span>{codeLabel}</span>
          <MaterialIcon name="content_copy" size={16} />
          <span className="text-[10px] font-sans font-semibold uppercase tracking-wide text-on-surface-variant">
            Copy code
          </span>
        </button>
        {onShare ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-full px-2"
            onClick={() => onShare()}
          >
            <MaterialIcon name="ios_share" size={18} />
            Share
          </Button>
        ) : null}
      </div>

      {expanded ? (
        <div className="border-t border-outline-variant/20 bg-surface-container-low/40 px-4 pb-4 pt-3">
          <InstructorRosterToolbar
            search={search}
            onSearchChange={setSearch}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            counts={counts}
          />

          {counts.all === 0 ? (
            <p className="mt-3 text-center text-body-sm text-on-surface-variant">
              No swimmers yet — parents can join with your class code.
            </p>
          ) : filtered.length === 0 ? (
            <p className="mt-3 text-center text-body-sm text-on-surface-variant">
              No swimmers match your filters.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {filtered.map(({ entry, displayStatus }) => (
                <li key={entry.childId}>
                  <RosterStudentCard entry={entry} displayStatus={displayStatus} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </article>
  )
}
