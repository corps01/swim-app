import { cn } from '../../lib/cn'
import { MaterialIcon } from '../ui'

export type SwimmerListFilter = 'all' | 'missing' | 'issues' | 'completed'

export interface SwimmerListFilterCounts {
  all: number
  missing: number
  issues: number
  completed: number
}

interface InstructorSwimmersToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  activeFilter: SwimmerListFilter
  onFilterChange: (filter: SwimmerListFilter) => void
  counts: SwimmerListFilterCounts
}

export function InstructorSwimmersToolbar({
  search,
  onSearchChange,
  activeFilter,
  onFilterChange,
  counts,
}: InstructorSwimmersToolbarProps) {
  const showClear = search.trim().length > 0

  return (
    <section className="sticky top-16 z-30 bg-surface/90 py-stack-tight backdrop-blur-md">
      <div className="relative flex w-full items-center">
        <MaterialIcon
          name="search"
          size={22}
          className="pointer-events-none absolute left-4 text-outline"
        />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search swimmer name..."
          className="h-12 w-full rounded-2xl bg-surface-container-lowest py-0 pl-11 pr-10 text-body-md text-on-surface shadow-[0_2px_12px_rgba(0,100,124,0.04)] outline-none transition-all placeholder:text-outline focus:ring-2 focus:ring-primary/20"
        />
        {showClear ? (
          <button
            type="button"
            aria-label="Clear search"
            className="absolute right-3 flex size-8 items-center justify-center rounded-full text-outline active:bg-surface-container"
            onClick={() => onSearchChange('')}
          >
            <MaterialIcon name="close" size={18} />
          </button>
        ) : null}
      </div>

      <div className="-mx-margin-screen flex items-center gap-2 overflow-x-auto px-margin-screen pb-1 pt-stack-tight [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FilterPill
          label="All"
          count={counts.all}
          active={activeFilter === 'all'}
          onClick={() => onFilterChange('all')}
          primary
        />
        <FilterPill
          label="Missing"
          count={counts.missing}
          active={activeFilter === 'missing'}
          onClick={() => onFilterChange('missing')}
          dotClass="bg-amber-500"
        />
        <FilterPill
          label="Issues"
          count={counts.issues}
          active={activeFilter === 'issues'}
          onClick={() => onFilterChange('issues')}
          dotClass="bg-tertiary"
        />
        <FilterPill
          label="Completed"
          count={counts.completed}
          active={activeFilter === 'completed'}
          onClick={() => onFilterChange('completed')}
          dotClass="bg-secondary"
        />
      </div>
    </section>
  )
}

function FilterPill({
  label,
  count,
  active,
  onClick,
  primary = false,
  dotClass,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
  primary?: boolean
  dotClass?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-label-md transition-transform active:scale-95',
        active
          ? 'bg-primary text-on-primary shadow-[0_2px_8px_rgba(0,100,124,0.2)]'
          : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high',
      )}
    >
      {dotClass ? <span className={cn('size-2 rounded-full', dotClass)} aria-hidden /> : null}
      <span>{label}</span>
      <span
        className={cn(
          'rounded-full px-1.5 py-0.5 text-label-sm',
          active && primary ? 'bg-on-primary/20' : 'text-outline',
        )}
      >
        {count}
      </span>
    </button>
  )
}
