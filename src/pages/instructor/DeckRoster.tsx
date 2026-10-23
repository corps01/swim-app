import type { SessionDeckSwimmer } from '../../lib/api/sessionDeck'
import type { DeckFitness } from '../../lib/api/budsClearance'
import type { AttendanceMark } from '../../lib/sessionAttendance'
import { getDeckClearanceState, type DeckClearanceStatus } from '../../utils/healthClearance'
import { DeckSwimmerCard } from '../../components/instructor/DeckSwimmerCard'
import { Button, MaterialIcon } from '../../components/ui'
import { cn } from '../../lib/cn'

export type DeckRosterFilter = 'all' | 'cleared' | 'alert' | 'missing'

interface DeckRosterProps {
  swimmers: SessionDeckSwimmer[]
  marks: Record<string, AttendanceMark>
  fitnessByChild: Map<string, DeckFitness>
  formPendingByChild: Map<string, boolean>
  filter: DeckRosterFilter
  onFilter: (filter: DeckRosterFilter) => void
  overrideChildId: string | null
  onOpenSwimmer: (childId: string) => void
  onMarkAttendance: (childId: string, mark: 'present' | 'absent') => void
  onLogProgress: (childId: string) => void
  onVerbalClearance: (childId: string, reason: string) => void
  onShare: () => void
}

function matches(filter: DeckRosterFilter, status: DeckClearanceStatus): boolean {
  if (filter === 'all') return true
  if (filter === 'cleared') return status === 'CLEARED'
  if (filter === 'alert') return status === 'BARRED' || status === 'CAUTION'
  return status === 'FORM_PENDING'
}

export function DeckRoster({
  swimmers,
  marks,
  fitnessByChild,
  formPendingByChild,
  filter,
  onFilter,
  overrideChildId,
  onOpenSwimmer,
  onMarkAttendance,
  onLogProgress,
  onVerbalClearance,
  onShare,
}: DeckRosterProps) {
  const states = swimmers.map((swimmer) =>
    getDeckClearanceState(
      { formPending: formPendingByChild.get(swimmer.childId) ?? false },
      fitnessByChild.get(swimmer.childId) ?? null,
    ),
  )
  const counts = {
    all: swimmers.length,
    cleared: states.filter((state) => state.status === 'CLEARED').length,
    alert: states.filter((state) => state.status === 'BARRED' || state.status === 'CAUTION').length,
    missing: states.filter((state) => state.status === 'FORM_PENDING').length,
  }
  const visible = swimmers.filter((_, index) => matches(filter, states[index].status))
  const pills: { id: DeckRosterFilter; label: string; count: number; dot?: string }[] = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'cleared', label: 'Cleared', count: counts.cleared, dot: 'bg-emerald-500' },
    { id: 'alert', label: 'Barred / Alert', count: counts.alert, dot: 'bg-rose-500' },
    { id: 'missing', label: 'Missing BUDS', count: counts.missing, dot: 'bg-amber-500' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter swimmers">
        {pills.map((pill) => {
          const active = filter === pill.id
          return (
            <button
              key={pill.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onFilter(pill.id)}
              className={cn(
                'flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-label-md font-semibold active:scale-95',
                active ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant',
              )}
            >
              {pill.dot ? <span className={cn('size-2 rounded-full', pill.dot)} /> : null}
              {pill.label}
              <span className={cn('rounded-full px-1.5 text-label-sm', active ? 'bg-white/20' : 'bg-surface-container-high')}>
                {pill.count}
              </span>
            </button>
          )
        })}
      </div>

      {swimmers.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl bg-surface-container-low px-6 py-10 text-center">
          <p className="text-headline-sm text-on-surface">No swimmers enrolled in this class yet</p>
          <Button type="button" className="mt-4 h-11 rounded-full" onClick={onShare}>
            <MaterialIcon name="ios_share" size={20} />
            Share options
          </Button>
        </div>
      ) : null}

      {swimmers.length > 0 && visible.length === 0 ? (
        <div className="rounded-3xl bg-surface-container-low px-6 py-10 text-center">
          <p className="text-headline-sm text-on-surface">No swimmers match this filter</p>
          <Button type="button" className="mt-4 rounded-full" onClick={() => onFilter('all')}>
            Show everyone
          </Button>
        </div>
      ) : null}

      {visible.map((swimmer) => (
        <DeckSwimmerCard
          key={swimmer.childId}
          swimmer={swimmer}
          mark={marks[swimmer.childId] ?? 'unmarked'}
          formPending={formPendingByChild.get(swimmer.childId) ?? false}
          fitness={fitnessByChild.get(swimmer.childId) ?? null}
          overridePending={overrideChildId === swimmer.childId}
          onOpenSwimmer={() => onOpenSwimmer(swimmer.childId)}
          onMarkAttendance={(mark) => onMarkAttendance(swimmer.childId, mark)}
          onLogProgress={() => onLogProgress(swimmer.childId)}
          onVerbalClearance={(reason) => onVerbalClearance(swimmer.childId, reason)}
        />
      ))}
    </div>
  )
}
