import { ClassContextBanner, ClassDetailRows } from '../home/ClassContextBanner'
import { accentForClass, CLASS_ACCENT_STYLES } from '../../lib/classAccent'
import { formatClassCodeDisplay } from '../../lib/instructorInvite'
import type { SwimClass } from '../../types/class'
import { Button, MaterialIcon } from '../ui'
import { cn } from '../../lib/cn'

interface InstructorClassCardProps {
  classRow: SwimClass
  swimmerCount: number
  hasScheduleRules?: boolean
  seasonStart?: string | null
  seasonEnd?: string | null
  listIndex?: number
  instructorName?: string
  onCopyCode: (code: string) => void
  onShare?: () => void
  onEditSchedule?: () => void
  onViewSwimmers?: () => void
}

export function InstructorClassCard({
  classRow,
  swimmerCount,
  hasScheduleRules = true,
  seasonStart = null,
  seasonEnd = null,
  listIndex = 0,
  instructorName = 'Coach',
  onCopyCode,
  onShare,
  onEditSchedule,
  onViewSwimmers,
}: InstructorClassCardProps) {
  const accent = accentForClass(classRow.id, listIndex)
  const accentStyle = CLASS_ACCENT_STYLES[accent]

  const codeLabel = formatClassCodeDisplay(classRow.class_code)
  const scheduleLine = classRow.schedule_details?.trim()
  const swimmerLabel = `${swimmerCount} Swimmer${swimmerCount === 1 ? '' : 's'}`

  return (
    <article
      className="overflow-hidden rounded-3xl border border-outline-variant/30 bg-surface-container-lowest shadow-[0_4px_16px_-2px_rgba(0,100,124,0.06)]"
    >
      {!hasScheduleRules ? (
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-body-sm text-on-surface"
          role="status"
        >
          <span className="font-medium">Not on Today — add weekly session times.</span>
          {onEditSchedule ? (
            <button
              type="button"
              className="shrink-0 font-bold text-primary underline"
              onClick={() => onEditSchedule()}
            >
              Edit schedule
            </button>
          ) : null}
        </div>
      ) : null}

      <ClassContextBanner
        accent={accent}
        title={classRow.name}
        subtitle={scheduleLine || 'Schedule not set — add session times'}
        className="rounded-none shadow-none"
        aside={
          onViewSwimmers ? (
            <button
              type="button"
              onClick={onViewSwimmers}
              className="rounded-xl border border-white/25 bg-white/15 px-3 py-2 text-center backdrop-blur-sm transition-transform active:scale-95"
            >
              <span className="block text-[10px] font-semibold uppercase tracking-tight text-white/90">
                View
              </span>
              <span className="text-label-md font-extrabold text-white">{swimmerLabel}</span>
            </button>
          ) : (
            <span className="rounded-xl border border-white/25 bg-white/15 px-3 py-2 text-center backdrop-blur-sm">
              <span className="text-label-md font-extrabold text-white">{swimmerLabel}</span>
            </span>
          )
        }
      >
        <ClassDetailRows
          accent={accent}
          schedule={scheduleLine || 'Schedule not set'}
          location={classRow.location?.trim() || 'Location not set'}
          instructor={instructorName}
          seasonStart={seasonStart}
          seasonEnd={seasonEnd}
        />
        {onEditSchedule ? (
          <div className="mt-3 border-t border-outline-variant/15 pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 w-full justify-center rounded-full"
              onClick={() => onEditSchedule()}
            >
              <MaterialIcon name="edit_calendar" size={18} />
              Edit schedule
            </Button>
          </div>
        ) : null}
      </ClassContextBanner>

      <div className="flex flex-col gap-3 border-t border-outline-variant/15 px-4 py-4">
        <button
          type="button"
          onClick={() => onCopyCode(classRow.class_code)}
          className={cn(
            'flex w-full items-center justify-center gap-3 rounded-2xl border-2 px-4 py-4 font-mono transition-colors active:scale-[0.99]',
            accentStyle.detailIconClass,
            'border-current/25 bg-surface-container-low hover:bg-surface-container',
          )}
        >
          <span className="text-headline-md font-extrabold tracking-[0.2em]">{codeLabel}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-label-sm font-bold text-on-primary">
            <MaterialIcon name="content_copy" size={16} />
            Copy code
          </span>
        </button>

        <div className="flex gap-2">
          {onShare ? (
            <Button type="button" className="h-11 flex-1 rounded-full" onClick={() => onShare()}>
              <MaterialIcon name="ios_share" size={20} />
              Share options
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  )
}
