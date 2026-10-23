import { useState } from 'react'
import type { SessionDeckSwimmer } from '../../lib/api/sessionDeck'
import type { DeckFitness } from '../../lib/api/budsClearance'
import type { AttendanceMark } from '../../lib/sessionAttendance'
import { getDeckClearanceState } from '../../utils/healthClearance'
import { MaterialIcon, ProfileAvatar } from '../ui'
import { cn } from '../../lib/cn'

interface DeckSwimmerCardProps {
  swimmer: SessionDeckSwimmer
  mark: AttendanceMark
  formPending: boolean
  fitness?: DeckFitness | null
  overridePending?: boolean
  onOpenSwimmer?: () => void
  onMarkAttendance: (mark: 'present' | 'absent') => void
  onLogProgress: () => void
  onVerbalClearance?: (reason: string) => void
}

export function DeckSwimmerCard({
  swimmer,
  mark,
  formPending,
  fitness,
  overridePending = false,
  onOpenSwimmer,
  onMarkAttendance,
  onLogProgress,
  onVerbalClearance,
}: DeckSwimmerCardProps) {
  const [notesOpen, setNotesOpen] = useState(false)
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [reason, setReason] = useState('')
  const clearance = getDeckClearanceState({ formPending }, fitness)
  const fullName = `${swimmer.firstName} ${swimmer.lastName}`.trim()
  const phone = swimmer.parentPhone?.replace(/\s/g, '') || null
  const hasNotes = swimmer.notes.trim().length > 0

  return (
    <article className="flex flex-col gap-3 rounded-2xl bg-surface-container-lowest p-card-padding shadow-[0_4px_16px_-2px_rgba(8,145,178,0.08)]">
      <div className={cn('flex flex-col gap-1.5 rounded-md px-3 py-3', clearance.color)}>
        <div className="flex items-center gap-1.5">
          <MaterialIcon name={clearance.icon} size={22} className={clearance.accent} />
          <p className={cn('text-label-lg font-black uppercase tracking-wider', clearance.accent)}>{clearance.label}</p>
        </div>
        <p className="text-body-sm leading-tight">{clearance.detail}</p>
        {clearance.canOverride && onVerbalClearance ? (
          overrideOpen ? (
            <form
              className="mt-1 flex flex-col gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                onVerbalClearance(reason.trim() || 'Verbal deck clearance')
                setOverrideOpen(false)
              }}
            >
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Override note"
                className="h-11 rounded-xl bg-surface-container-lowest px-3 text-body-md text-on-surface"
                aria-label={`Override note for ${fullName}`}
              />
              <button
                type="submit"
                disabled={overridePending}
                className="flex h-11 items-center justify-center gap-2 rounded-full bg-primary text-label-md font-bold text-on-primary active:scale-95 disabled:opacity-60"
              >
                <MaterialIcon name="bolt" size={18} />
                {overridePending ? 'Saving…' : 'Save verbal clearance'}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setOverrideOpen(true)}
              className="mt-1 flex h-11 items-center justify-center gap-2 rounded-full bg-primary text-label-md font-bold text-on-primary active:scale-95"
            >
              <MaterialIcon name="bolt" size={18} />
              Verbal deck clearance
            </button>
          )
        ) : null}
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ProfileAvatar firstName={swimmer.firstName} lastName={swimmer.lastName} size="lg" />
          <div className="min-w-0">
            {onOpenSwimmer ? (
              <button
                type="button"
                onClick={onOpenSwimmer}
                className="truncate text-left text-headline-sm text-on-surface"
              >
                {fullName}
              </button>
            ) : (
              <h3 className="truncate text-headline-sm text-on-surface">{fullName}</h3>
            )}
            <p className="truncate text-body-sm text-on-surface-variant">Parent: {swimmer.parentName}</p>
          </div>
        </div>
        {phone ? (
          <a
            href={`tel:${phone}`}
            aria-label={`Call ${swimmer.parentName}`}
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-primary active:scale-95"
          >
            <MaterialIcon name="call" size={22} />
          </a>
        ) : (
          <span
            aria-label="No parent phone on file"
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-outline"
          >
            <MaterialIcon name="call" size={22} />
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {hasNotes ? (
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-surface-container px-3.5 text-label-md text-on-surface"
            aria-expanded={notesOpen}
            onClick={() => setNotesOpen((open) => !open)}
          >
            <MaterialIcon name="business_center" size={18} className="text-error" />
            Medical note
          </button>
        ) : null}
        <button
          type="button"
          onClick={onLogProgress}
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-surface-container px-3.5 text-label-md font-semibold text-primary active:scale-95"
        >
          <MaterialIcon name="assignment_add" size={18} />
          Log progress
        </button>
      </div>
      {hasNotes && notesOpen ? (
        <p className="rounded-xl bg-surface-container-low px-3 py-2 text-body-sm text-on-surface">{swimmer.notes}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onMarkAttendance('present')}
          className={cn(
            'flex h-14 items-center justify-center gap-1.5 rounded-full text-label-lg font-bold active:scale-95',
            mark === 'present' ? 'bg-secondary text-on-secondary' : 'bg-primary text-on-primary',
          )}
        >
          <MaterialIcon name="check" size={20} />
          Present
        </button>
        <button
          type="button"
          onClick={() => onMarkAttendance('absent')}
          className={cn(
            'flex h-14 items-center justify-center gap-1.5 rounded-full text-label-lg font-bold active:scale-95',
            mark === 'absent' ? 'bg-error text-on-error' : 'bg-surface-container-high text-on-surface',
          )}
        >
          <MaterialIcon name="close" size={20} />
          Absent
        </button>
      </div>

    </article>
  )
}
