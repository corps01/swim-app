import { useState } from 'react'
import type { SessionDeckSwimmer } from '../../lib/api/sessionDeck'
import type { AttendanceMark } from '../../lib/sessionAttendance'
import { MaterialIcon } from '../ui'
import { cn } from '../../lib/cn'

interface DeckSwimmerCardProps {
  swimmer: SessionDeckSwimmer
  mark: AttendanceMark
  onToggleAttendance: () => void
  onLogProgress: () => void
}

function attendanceMeta(mark: AttendanceMark): {
  label: string
  hint: string
  icon: string
  className: string
} {
  if (mark === 'present') {
    return {
      label: 'Present',
      hint: 'Tap cycles to Absent',
      icon: 'check_circle',
      className: 'bg-secondary-container text-on-secondary-container',
    }
  }
  if (mark === 'absent') {
    return {
      label: 'Absent',
      hint: 'Tap cycles to Unmarked',
      icon: 'cancel',
      className: 'bg-error-container text-on-error-container',
    }
  }
  return {
    label: 'Unmarked',
    hint: 'Tap to mark Present',
    icon: 'radio_button_unchecked',
    className: 'bg-surface-container-high text-on-surface',
  }
}

export function DeckSwimmerCard({ swimmer, mark, onToggleAttendance, onLogProgress }: DeckSwimmerCardProps) {
  const [notesExpanded, setNotesExpanded] = useState(false)
  const hasMedicalNotes = swimmer.notes.trim().length > 0
  const fullName = `${swimmer.firstName} ${swimmer.lastName}`
  const parentFirst = swimmer.parentName.split(' ')[0] || 'parent'
  const attendance = attendanceMeta(mark)

  return (
    <article
      className="flex flex-col gap-3.5 rounded-2xl bg-surface-container-lowest p-card-padding shadow-[0_4px_16px_-2px_rgba(8,145,178,0.08),0_2px_6px_-1px_rgba(15,23,42,0.04)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-headline-md text-on-surface">{fullName}</h3>
            {swimmer.hasFormAlert ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-tertiary-fixed px-2.5 py-0.5 text-label-sm font-bold text-on-tertiary-fixed">
                <MaterialIcon name="warning" size={14} />
                Forms pending
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-body-md text-on-surface-variant">
            <MaterialIcon name="family_restroom" size={16} className="text-outline" />
            Parent: <span className="font-semibold text-on-surface">{swimmer.parentName}</span>
          </p>
        </div>
        <button
          type="button"
          aria-label={`${fullName} attendance: ${attendance.label}. ${attendance.hint}`}
          onClick={onToggleAttendance}
          className={cn(
            'flex min-h-touch-action min-w-[8.5rem] shrink-0 flex-col items-center justify-center rounded-full px-4 text-center shadow-sm transition-transform active:scale-95',
            attendance.className,
          )}
        >
          <span className="flex items-center gap-1 text-label-lg font-bold">
            <MaterialIcon name={attendance.icon} size={20} />
            {attendance.label}
          </span>
          <span className="text-[10px] font-semibold leading-tight opacity-75">{attendance.hint}</span>
        </button>
      </div>

      {hasMedicalNotes ? (
        <div className="overflow-hidden rounded-xl bg-error-container/25">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left font-label-md text-tertiary transition-colors hover:bg-error-container/40"
            onClick={() => setNotesExpanded((open) => !open)}
            aria-expanded={notesExpanded}
          >
            <span className="flex items-center gap-1.5 font-bold">
              <MaterialIcon name="medical_services" size={18} />
              Medical / safety note {notesExpanded ? '(Tap to collapse)' : '(Expand)'}
            </span>
            <MaterialIcon
              name="expand_more"
              size={20}
              className={cn('transition-transform duration-200', notesExpanded && 'rotate-180')}
            />
          </button>
          {notesExpanded ? (
            <div className="px-3.5 pb-3 pt-1">
              <p className="rounded-lg bg-surface-container-lowest p-3 text-body-md text-on-surface shadow-sm">
                {swimmer.notes}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-container-low/60 p-2.5">
        <button
          type="button"
          onClick={onLogProgress}
          className="inline-flex h-11 items-center gap-1.5 rounded-full bg-surface-container px-4 text-label-md font-semibold text-primary transition-transform hover:bg-surface-container-high active:scale-95"
        >
          <MaterialIcon name="assignment_add" size={18} />
          Log progress
        </button>
        {swimmer.parentPhone ? (
          <a
            href={`tel:${swimmer.parentPhone.replace(/\s/g, '')}`}
            className="inline-flex h-11 items-center gap-1.5 rounded-full bg-primary-fixed px-4 text-label-md font-semibold text-on-primary-fixed-variant transition-transform hover:bg-primary-fixed-dim active:scale-95"
          >
            <MaterialIcon name="call" size={18} />
            Call {parentFirst}
          </a>
        ) : (
          <span
            className="inline-flex h-11 cursor-not-allowed select-none items-center gap-1.5 rounded-full bg-surface-container px-4 text-label-md text-outline"
          >
            <MaterialIcon name="phone_disabled" size={18} />
            No phone on file
          </span>
        )}
      </div>
    </article>
  )
}
