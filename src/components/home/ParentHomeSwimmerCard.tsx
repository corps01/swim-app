import { useState } from 'react'
import {
  ageFromDateOfBirth,
  formatDateOfBirth,
  type SwimmerClassEnrollment,
  type SwimmerRosterEntry,
} from '../../lib/swimmers'
import { leaveClassEnrollment } from '../../lib/api/parentEnrollment'
import { accentForClass } from '../../lib/classAccent'
import type { ProgressLog } from '../../lib/api/progressLogs'
import { formatLatestActivitySnippet } from '../../lib/progressLogDisplay'
import { Badge, Button, MaterialIcon } from '../ui'
import { ClassContextBanner, ClassDetailRows } from './ClassContextBanner'

interface ParentHomeSwimmerCardProps {
  swimmer: SwimmerRosterEntry
  parentUserId: string
  latestActivity?: ProgressLog | null
  activityLoading?: boolean
  onEnroll?: (childId: string) => void
  onEdit?: () => void
  onViewActivity?: () => void
  onEnrollmentChanged?: () => void
}

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

function ClassEnrollmentBanner({
  enrollment,
  index,
  onLeave,
  leaving,
}: {
  enrollment: SwimmerClassEnrollment
  index: number
  onLeave: () => void
  leaving: boolean
}) {
  const accent = accentForClass(enrollment.classId, index)
  const schedule = enrollment.scheduleDetails?.trim() || 'Schedule not set'
  const location = enrollment.location?.trim() || 'Location not set'
  const instructor = enrollment.instructorName?.trim() || 'Instructor'

  return (
    <ClassContextBanner
      accent={accent}
      title={enrollment.className ?? 'Class'}
      pill={enrollment.status === 'pending' ? 'Pending' : 'Class'}
      subtitle={`Coach ${instructor}`}
    >
      <ClassDetailRows
        accent={accent}
        schedule={schedule}
        location={location}
        instructor={instructor}
        seasonStart={enrollment.seasonStart}
        seasonEnd={enrollment.seasonEnd}
      />
      <div className="mt-3 flex justify-end border-t border-outline-variant/20 pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="rounded-full text-error"
          disabled={leaving || !enrollment.classId}
          onClick={() => void onLeave()}
        >
          {leaving ? 'Leaving…' : 'Leave class'}
        </Button>
      </div>
    </ClassContextBanner>
  )
}

function SwimmerActivityLink({
  swimmerFirstName,
  latestActivity,
  activityLoading,
  onViewActivity,
}: {
  swimmerFirstName: string
  latestActivity?: ProgressLog | null
  activityLoading?: boolean
  onViewActivity: () => void
}) {
  const hasUpdate = Boolean(latestActivity)
  const hasPhoto = Boolean(latestActivity?.photoUrl)

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex w-full flex-col gap-2 rounded-2xl border border-primary/20 bg-surface-container-low p-3 text-left">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary">
            <MaterialIcon name={hasPhoto ? 'photo_library' : 'timeline'} size={20} />
          </div>
          <div className="min-w-0">
            <span className="text-label-md font-bold text-on-surface">Progress &amp; photos</span>
            <p className="text-label-sm text-on-surface-variant">Coach updates from the pool deck</p>
          </div>
        </div>

        {activityLoading ? (
          <p className="text-body-sm text-on-surface-variant">Loading activity…</p>
        ) : hasUpdate ? (
          <div className="flex items-center gap-3 rounded-xl bg-surface-container-lowest p-2.5">
            {latestActivity?.photoUrl ? (
              <img
                src={latestActivity.photoUrl}
                alt=""
                className="size-14 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-surface-container text-outline">
                <MaterialIcon name="edit_note" size={24} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="text-label-sm font-bold uppercase tracking-wide text-primary">Latest</span>
              <p className="line-clamp-2 text-body-sm font-medium text-on-surface">
                {formatLatestActivitySnippet(latestActivity!)}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-outline-variant/50 bg-surface-container-lowest px-3 py-4 text-center">
            <MaterialIcon name="photo_camera" size={28} className="text-outline" />
            <p className="text-body-sm font-medium text-on-surface">No updates yet</p>
            <p className="text-body-sm text-on-surface-variant">
              When your coach logs progress or shares a poolside photo, it will show up here.
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onViewActivity}
        aria-label={`View progress updates and photos for ${swimmerFirstName}`}
        className="relative flex min-h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-[linear-gradient(90deg,#1e3a8a,#1d4ed8,#0284c7,#0891b2,#06b6d4,#14b8a6,#2dd4bf,#14b8a6,#06b6d4,#0891b2,#0284c7,#1d4ed8,#1e3a8a)] bg-[length:200%_100%] px-5 py-3 text-label-md font-bold text-white shadow-md shadow-cyan-500/25 animate-stream-flow transition-[box-shadow,transform] hover:ring-2 hover:ring-cyan-300/50 active:scale-[0.99] active:ring-2 active:ring-cyan-300/50 motion-reduce:animate-none"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(255,255,255,0.45),transparent_58%)] animate-stream-ripple motion-reduce:animate-none"
        />
        <MaterialIcon name="waves" size={20} className="relative" />
        <span className="relative sm:hidden">Progress &amp; Photos</span>
        <span className="relative hidden sm:inline">See Progress &amp; Photos</span>
        <MaterialIcon name="arrow_forward" size={20} className="relative" />
      </button>
    </div>
  )
}

export function ParentHomeSwimmerCard({
  swimmer,
  parentUserId,
  latestActivity,
  activityLoading,
  onEnroll,
  onEdit,
  onViewActivity,
  onEnrollmentChanged,
}: ParentHomeSwimmerCardProps) {
  const age = ageFromDateOfBirth(swimmer.dateOfBirth)
  const dobLabel = formatDateOfBirth(swimmer.dateOfBirth)
  const fullName = `${swimmer.firstName} ${swimmer.lastName}`
  const activeEnrollments = swimmer.enrollments.filter(
    (row) => row.status === 'active' && row.classId,
  )
  const pendingEnrollments = swimmer.enrollments.filter(
    (row) => row.status === 'pending' && row.classId,
  )

  const [leavingClassId, setLeavingClassId] = useState<string | null>(null)
  const [leaveError, setLeaveError] = useState<string | null>(null)

  async function handleLeave(classId: string) {
    setLeaveError(null)
    setLeavingClassId(classId)
    try {
      await leaveClassEnrollment(parentUserId, swimmer.id, classId)
      onEnrollmentChanged?.()
    } catch (err) {
      setLeaveError(err instanceof Error ? err.message : 'Could not leave class.')
    } finally {
      setLeavingClassId(null)
    }
  }

  return (
    <article
      className="flex flex-col gap-4 rounded-3xl bg-surface-container-lowest p-card-padding shadow-[0_4px_16px_-2px_rgba(0,100,124,0.08),0_2px_6px_-1px_rgba(15,23,42,0.04)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary-fixed text-lg font-bold text-on-primary-fixed-variant shadow-sm">
            {initials(swimmer.firstName, swimmer.lastName)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="truncate text-headline-sm text-on-surface">{fullName}</h4>
              {activeEnrollments.length > 0 ? (
                <Badge tone="success" size="sm">Enrolled</Badge>
              ) : pendingEnrollments.length > 0 ? (
                <Badge tone="warning" size="sm">Pending</Badge>
              ) : (
                <Badge tone="warning" size="sm">Not enrolled</Badge>
              )}
            </div>
            <span className="text-body-sm text-on-surface-variant">
              {age != null ? `${age} years old` : 'Age —'}
              {dobLabel ? ` (${dobLabel})` : ''}
            </span>
          </div>
        </div>
      </div>

      {onViewActivity ? (
        <SwimmerActivityLink
          swimmerFirstName={swimmer.firstName}
          latestActivity={latestActivity}
          activityLoading={activityLoading}
          onViewActivity={onViewActivity}
        />
      ) : null}

      {activeEnrollments.length > 0 || pendingEnrollments.length > 0 ? (
        <ul className="flex max-h-[min(28rem,70vh)] flex-col gap-3 overflow-y-auto pr-0.5 [-ms-overflow-style:auto] [scrollbar-width:thin]">
          {[...activeEnrollments, ...pendingEnrollments].map((enrollment, index) => (
            <li key={`${enrollment.classId}-${index}`}>
              <ClassEnrollmentBanner
                enrollment={enrollment}
                index={index}
                leaving={leavingClassId === enrollment.classId}
                onLeave={() => enrollment.classId && void handleLeave(enrollment.classId)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-outline-variant/50 bg-surface-container-low p-4 text-center">
          <p className="text-body-sm text-on-surface-variant">
            Not linked to a class yet. Use your instructor&apos;s class code to enroll.
          </p>
          {onEnroll ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-3 rounded-full"
              onClick={() => onEnroll(swimmer.id)}
            >
              Join a class
            </Button>
          ) : null}
        </div>
      )}

      {leaveError ? <p className="text-body-sm text-error">{leaveError}</p> : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="secondary" fullWidth className="h-11 rounded-2xl" onClick={onEdit}>
          <MaterialIcon name="edit" size={18} />
          Edit profile
        </Button>
        {activeEnrollments.length > 0 && onEnroll ? (
          <Button type="button" variant="ghost" fullWidth className="h-11 rounded-2xl" onClick={() => onEnroll(swimmer.id)}>
            <MaterialIcon name="add" size={18} />
            Add another class
          </Button>
        ) : null}
      </div>
    </article>
  )
}
