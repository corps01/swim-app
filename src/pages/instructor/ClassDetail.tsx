import { useEffect, useMemo, useState } from 'react'
import { wavePhaseFor } from '../../components/graphics/DriftWaves'
import { ClassContextBanner, ClassDetailRows } from '../../components/home/ClassContextBanner'
import { FormComplianceBadge } from '../../components/instructor/FormComplianceBadge'
import { AppLayout } from '../../components/layout'
import { Badge, Button, Card, MaterialIcon, Spinner } from '../../components/ui'
import { controlClass } from '../../components/ui/styles'
import { useAppPath } from '../../hooks/useAppPath'
import { useAuth } from '../../hooks/useAuth'
import { fetchClassBudsDay } from '../../lib/api/forms'
import {
  fetchSessionDeckClass,
  fetchSessionDeckSwimmers,
  type SessionDeckClassMeta,
  type SessionDeckSwimmer,
} from '../../lib/api/sessionDeck'
import {
  classDetailOrigin,
  INSTRUCTOR_FORMS_PATH,
  instructorClassDetailPath,
  instructorEditClassPath,
  instructorSessionPath,
  instructorShareClassPath,
  instructorSubmissionPath,
  instructorSwimmerPath,
} from '../../lib/appNavigation'
import { accentForClass } from '../../lib/classAccent'
import { cn } from '../../lib/cn'
import { formatAppError } from '../../lib/errors'
import { formatAnswer } from '../../lib/formQuestions'
import { formatClassCodeDisplay } from '../../lib/instructorInvite'
import { ageFromDateOfBirth } from '../../lib/swimmers'
import { calendarDayHeading, formatCalendarDateKey, isCalendarDateKey } from '../../lib/timeZone/calendar'
import type { ChildBudsEntry, ClassBudsDay } from '../../types/questionnaire'

interface ClassDetailProps {
  classId: string
  onBack: () => void
  onNavigate: (path: string) => void
}

function formatSignedTime(iso: string, timeZone: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, { timeZone, hour: 'numeric', minute: '2-digit' }).format(date)
}

function RosterCard({
  swimmer,
  onOpenSwimmer,
}: {
  swimmer: SessionDeckSwimmer
  onOpenSwimmer: () => void
}) {
  const fullName = `${swimmer.firstName} ${swimmer.lastName}`
  const age = swimmer.dateOfBirth ? ageFromDateOfBirth(swimmer.dateOfBirth) : null

  return (
    <Card variant="outline" className="gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onOpenSwimmer}
            className="truncate text-left text-headline-sm text-primary"
          >
            {fullName}
          </button>
          <p className="text-body-sm text-on-surface-variant">
            {age !== null && age >= 0 ? `Age ${age}` : 'Age not set'}
          </p>
        </div>
        {swimmer.enrollmentStatus === 'pending' ? <Badge tone="warning">Pending</Badge> : null}
      </div>

      {swimmer.notes ? (
        <div className="rounded-xl bg-error-container/25 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-label-md font-bold text-tertiary">
            <MaterialIcon name="medical_services" size={18} />
            Medical / safety note
          </p>
          <p className="mt-1 whitespace-pre-wrap text-body-md text-on-surface">{swimmer.notes}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-container-low/60 p-2.5">
        <span className="flex min-w-0 items-center gap-1.5 text-body-md text-on-surface">
          <MaterialIcon name="person" size={18} className="text-primary" />
          <span className="truncate">{swimmer.parentName}</span>
        </span>
        {swimmer.parentPhone ? (
          <a
            href={`tel:${swimmer.parentPhone.replace(/\s/g, '')}`}
            className="inline-flex h-11 items-center gap-1.5 rounded-full bg-primary-fixed px-4 text-label-md font-semibold text-on-primary-fixed-variant active:scale-95"
          >
            <MaterialIcon name="call" size={18} />
            {swimmer.parentPhone}
          </a>
        ) : (
          <span className="inline-flex h-11 items-center gap-1.5 text-label-md text-outline">
            <MaterialIcon name="phone_disabled" size={18} />
            No phone on file
          </span>
        )}
      </div>
    </Card>
  )
}

function BudsCard({
  swimmer,
  entry,
  timeZone,
  onOpenSwimmer,
  onOpenSubmission,
}: {
  swimmer: SessionDeckSwimmer
  entry: ChildBudsEntry | null
  timeZone: string
  onOpenSwimmer: () => void
  onOpenSubmission: (submissionId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const fullName = `${swimmer.firstName} ${swimmer.lastName}`
  const signedTime = entry ? formatSignedTime(entry.signedAt, timeZone) : ''

  return (
    <Card variant="outline" className="gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onOpenSwimmer}
          className="min-w-0 truncate text-left text-headline-sm text-primary"
        >
          {fullName}
        </button>
        <FormComplianceBadge
          status={entry ? 'signed' : 'pending'}
          swimmerName={fullName}
          label={entry ? `Submitted${signedTime ? ` · ${signedTime}` : ''}` : 'Missing'}
        />
      </div>

      {entry ? (
        <>
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((open) => !open)}
            className="flex min-h-11 w-full items-center justify-between rounded-xl bg-surface-container-low px-3 text-label-md text-primary"
          >
            {expanded ? 'Hide responses' : 'Show responses'}
            <MaterialIcon
              name="expand_more"
              size={20}
              className={cn('transition-transform duration-200', expanded && 'rotate-180')}
            />
          </button>
          {expanded ? (
            <div className="flex flex-col gap-4">
              {entry.groups.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant">No answers were recorded.</p>
              ) : (
                entry.groups.map((group) => (
                  <section key={group.sectionId} className="flex flex-col gap-2">
                    <h4 className="text-label-sm uppercase tracking-wider text-primary">{group.label}</h4>
                    <ul className="flex flex-col gap-2">
                      {group.answers.map((answer, index) => (
                        <li
                          key={`${answer.question_text}-${index}`}
                          className="border-b border-outline-variant/30 pb-2 last:border-b-0"
                        >
                          <p className="text-body-sm text-on-surface-variant">{answer.question_text}</p>
                          <p className="mt-0.5 whitespace-pre-wrap text-body-md text-on-surface">
                            {formatAnswer(answer.input_type, answer.answer) || '—'}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))
              )}
              <Button
                type="button"
                variant="secondary"
                size="md"
                className="rounded-full"
                onClick={() => onOpenSubmission(entry.submissionId)}
              >
                <MaterialIcon name="description" size={18} />
                Open signed form
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-body-sm text-on-surface-variant">No BUDS check-in for this date.</p>
      )}
    </Card>
  )
}

export function ClassDetail({ classId, onBack, onNavigate }: ClassDetailProps) {
  const { user } = useAuth()
  const { search, replace } = useAppPath()
  const [meta, setMeta] = useState<SessionDeckClassMeta | null>(null)
  const [swimmers, setSwimmers] = useState<SessionDeckSwimmer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [buds, setBuds] = useState<ClassBudsDay | null>(null)
  const [budsLoading, setBudsLoading] = useState(false)
  const [budsError, setBudsError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const dateParam = new URLSearchParams(search).get('date')?.trim() ?? ''
  const origin = classDetailOrigin(search)
  const timeZone = meta?.timezone ?? null
  const dateKey = useMemo(() => {
    if (isCalendarDateKey(dateParam)) return dateParam
    return timeZone ? formatCalendarDateKey(new Date(), timeZone) : null
  }, [dateParam, timeZone])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [classRow, roster] = await Promise.all([
          fetchSessionDeckClass(classId),
          fetchSessionDeckSwimmers(classId),
        ])
        if (cancelled) return
        setMeta(classRow)
        setSwimmers(roster)
      } catch (err) {
        if (!cancelled) setError(formatAppError(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [classId])

  const childIdsKey = swimmers.map((swimmer) => swimmer.childId).join(',')

  useEffect(() => {
    if (!timeZone || !dateKey) return
    const childIds = childIdsKey ? childIdsKey.split(',') : []
    let cancelled = false
    setBudsLoading(true)
    setBudsError(null)
    void fetchClassBudsDay({ classId, childIds, dateKey, timeZone })
      .then((next) => {
        if (!cancelled) setBuds(next)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setBuds(null)
          setBudsError(formatAppError(err))
        }
      })
      .finally(() => {
        if (!cancelled) setBudsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [classId, childIdsKey, dateKey, timeZone])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      setToast('Class code copied.')
    } catch {
      setToast('Could not copy the code.')
    }
  }

  const accent = accentForClass(classId)
  const submittedCount = buds ? swimmers.filter((swimmer) => buds.entriesByChild.has(swimmer.childId)).length : 0
  const selfPath = instructorClassDetailPath(classId, {
    date: dateKey ?? undefined,
    from: origin === 'today' ? undefined : origin,
  })

  return (
    <AppLayout
      title={meta?.name ?? 'Class'}
      subtitle="Class details"
      onBack={onBack}
      backLabel={
        origin === 'classes' ? '← Back to Classes' : origin === 'swimmers' ? '← Back to Swimmers' : '← Back to Today'
      }
      wide
    >
      {loading ? (
        <Spinner className="pb-8" label="Loading class…" />
      ) : error ? (
        <p role="alert" className="pb-8 text-body-md text-error">
          {error}
        </p>
      ) : !meta ? (
        <p className="pb-8 text-body-md text-on-surface-variant">This class could not be found.</p>
      ) : (
        <div className="flex flex-col gap-stack-loose pb-10">
          <ClassContextBanner
            accent={accent}
            title={meta.name}
            pill="Class"
            subtitle={meta.scheduleDetails?.trim() || 'Schedule not set'}
            wavePhase={wavePhaseFor(classId)}
            className="rounded-3xl"
            aside={
              <div className="rounded-xl border border-white/25 bg-white/15 px-3 py-2 text-center backdrop-blur-sm">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/90">
                  Class code
                </span>
                <span className="font-mono text-headline-sm font-extrabold tracking-[0.15em] text-white">
                  {formatClassCodeDisplay(meta.classCode)}
                </span>
              </div>
            }
          >
            <ClassDetailRows
              accent={accent}
              schedule={meta.scheduleDetails?.trim() || 'Schedule not set'}
              location={meta.location?.trim() || 'Location not set'}
              instructor={user?.fullName ?? 'Coach'}
            />
          </ClassContextBanner>

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              className="h-11 rounded-full"
              onClick={() => void copyCode(meta.classCode)}
            >
              <MaterialIcon name="content_copy" size={18} />
              Copy code {formatClassCodeDisplay(meta.classCode)}
            </Button>
            <Button
              type="button"
              className="h-11 rounded-full"
              onClick={() => onNavigate(`${instructorShareClassPath(classId)}?from=${encodeURIComponent(selfPath)}`)}
            >
              <MaterialIcon name="ios_share" size={18} />
              Share code
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="h-11 flex-1 rounded-full"
                onClick={() => onNavigate(instructorEditClassPath(classId))}
              >
                <MaterialIcon name="edit_calendar" size={18} />
                Edit schedule
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-11 flex-1 rounded-full"
                onClick={() => onNavigate(`${INSTRUCTOR_FORMS_PATH}?from=${encodeURIComponent(selfPath)}`)}
              >
                <MaterialIcon name="assignment" size={18} />
                Assign form
              </Button>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="h-11 rounded-full"
              onClick={() =>
                onNavigate(
                  `${instructorSessionPath(classId, dateKey ?? undefined)}${
                    dateKey ? '&' : '?'
                  }from=${encodeURIComponent(selfPath)}`,
                )
              }
            >
              <MaterialIcon name="fact_check" size={18} />
              Open deck
            </Button>
          </div>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-headline-sm text-on-surface">Enrolled swimmers</h2>
              <span className="rounded-full bg-surface-container-high px-2.5 py-1 text-label-sm text-on-surface-variant">
                {swimmers.length}
              </span>
            </div>
            {swimmers.length === 0 ? (
              <Card variant="muted">
                <p className="text-body-md text-on-surface-variant">
                  No swimmers enrolled yet. Parents join with class code {formatClassCodeDisplay(meta.classCode)}.
                </p>
              </Card>
            ) : (
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {swimmers.map((swimmer) => (
                  <li key={swimmer.childId} className="min-w-0">
                    <RosterCard
                      swimmer={swimmer}
                      onOpenSwimmer={() =>
                        onNavigate(instructorSwimmerPath(swimmer.childId, { from: selfPath }))
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-headline-sm text-on-surface">Daily BUDS</h2>
                <p className="text-body-sm text-on-surface-variant">
                  {dateKey ? calendarDayHeading(dateKey, meta.timezone) : ''}
                  {buds && buds.templateIds.length > 0 && swimmers.length > 0
                    ? ` · ${submittedCount} of ${swimmers.length} submitted`
                    : ''}
                </p>
              </div>
              <label className="flex flex-col gap-1 text-label-md text-on-surface">
                Date
                <input
                  type="date"
                  value={dateKey ?? ''}
                  onChange={(event) => {
                    if (isCalendarDateKey(event.target.value)) {
                      replace(
                        instructorClassDetailPath(classId, {
                          date: event.target.value,
                          from: origin === 'today' ? undefined : origin,
                        }),
                      )
                    }
                  }}
                  className={cn(controlClass, 'w-auto')}
                />
              </label>
            </div>

            {budsLoading ? (
              <Spinner label="Loading BUDS check-ins…" />
            ) : budsError ? (
              <p role="alert" className="text-body-md text-error">
                {budsError}
              </p>
            ) : !buds || buds.templateIds.length === 0 ? (
              <Card variant="muted" className="gap-3">
                <p className="text-body-md text-on-surface-variant">
                  No BUDS questionnaire is assigned to this class. Add the ISR Daily BUDS bank to a questionnaire and
                  assign it to this class.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  className="self-start rounded-full"
                  onClick={() => onNavigate(`${INSTRUCTOR_FORMS_PATH}?from=${encodeURIComponent(selfPath)}`)}
                >
                  <MaterialIcon name="assignment" size={18} />
                  Open Questionnaires
                </Button>
              </Card>
            ) : swimmers.length === 0 ? (
              <Card variant="muted">
                <p className="text-body-md text-on-surface-variant">BUDS check-ins appear here once swimmers enroll.</p>
              </Card>
            ) : (
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {swimmers.map((swimmer) => (
                  <li key={swimmer.childId} className="min-w-0">
                    <BudsCard
                      key={`${swimmer.childId}-${dateKey ?? ''}`}
                      swimmer={swimmer}
                      entry={buds.entriesByChild.get(swimmer.childId) ?? null}
                      timeZone={meta.timezone}
                      onOpenSwimmer={() =>
                        onNavigate(
                          instructorSwimmerPath(swimmer.childId, { tab: 'health', from: selfPath }),
                        )
                      }
                      onOpenSubmission={(submissionId) =>
                        onNavigate(instructorSubmissionPath(submissionId, { from: 'class', classId, date: dateKey }))
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
      {toast ? (
        <div
          className="pointer-events-none fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-full bg-on-surface/95 px-4 py-2.5 text-label-sm font-semibold text-surface-container-lowest shadow-lg"
          role="status"
        >
          {toast}
        </div>
      ) : null}
    </AppLayout>
  )
}
