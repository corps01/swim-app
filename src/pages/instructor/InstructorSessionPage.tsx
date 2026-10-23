import { useCallback, useEffect, useMemo, useState } from 'react'
import { DeckRoster, type DeckRosterFilter } from './DeckRoster'
import { useAppPath } from '../../hooks/useAppPath'
import { useAuth } from '../../hooks/useAuth'
import { fetchInstructorAgenda, type AgendaSession } from '../../lib/api/agenda'
import { fetchSessionDeckClass, fetchSessionDeckSwimmers, type SessionDeckSwimmer } from '../../lib/api/sessionDeck'
import { formatTimeRange12h } from '../../lib/classSchedule'
import { formatAppError } from '../../lib/errors'
import {
  INSTRUCTOR_HOME_PATH,
  instructorBackTarget,
  instructorProgressLogPath,
  instructorSessionPath,
  instructorShareClassPath,
  instructorSwimmerPath,
} from '../../lib/appNavigation'
import {
  fetchSwimmerFormCompliance,
  formComplianceKey,
} from '../../lib/api/forms'
import { fetchDeckFitness, recordDeckVerbalClearance, type DeckFitness } from '../../lib/api/budsClearance'
import { attendanceTableMissing, loadSessionAttendance, persistAttendanceMark } from '../../lib/api/attendance'
import type { SwimmerFormCompliance } from '../../types/questionnaire'
import {
  countAttendance,
  replaceAttendanceMap,
  type AttendanceMark,
} from '../../lib/sessionAttendance'
import {
  calendarDayHeading,
  calendarMonthDayLabel,
  formatCalendarDateKey,
  isCalendarDateKey,
} from '../../lib/timeZone/calendar'
import { MaterialIcon } from '../../components/ui'


interface InstructorSessionPageProps {
  classId: string
  onNavigate: (path: string) => void
}

function pickSessionForClass(sessions: AgendaSession[], classId: string): AgendaSession | null {
  return sessions.find((session) => session.classId === classId) ?? null
}

export function InstructorSessionPage({ classId, onNavigate }: InstructorSessionPageProps) {
  const { search, goBack } = useAppPath()
  const { user } = useAuth()
  const dateParam = new URLSearchParams(search).get('date')?.trim() ?? ''

  const [classMeta, setClassMeta] = useState<Awaited<ReturnType<typeof fetchSessionDeckClass>> | null>(
    null,
  )
  const [dateKey, setDateKey] = useState<string | null>(isCalendarDateKey(dateParam) ? dateParam : null)
  const [sessionSlot, setSessionSlot] = useState<AgendaSession | null>(null)
  const [swimmers, setSwimmers] = useState<SessionDeckSwimmer[]>([])
  const [complianceByKey, setComplianceByKey] = useState<Map<string, SwimmerFormCompliance>>(new Map())
  const [fitnessByChild, setFitnessByChild] = useState<Map<string, DeckFitness>>(new Map())
  const [overrideChildId, setOverrideChildId] = useState<string | null>(null)
  const [marks, setMarks] = useState<Record<string, AttendanceMark>>({})
  const [attendanceWarning, setAttendanceWarning] = useState<string | null>(null)
  const [filter, setFilter] = useState<DeckRosterFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const meta = await fetchSessionDeckClass(classId)
      const sessionDate = isCalendarDateKey(dateParam)
        ? dateParam
        : formatCalendarDateKey(new Date(), meta?.timezone || 'UTC')
      const [roster, agenda] = await Promise.all([
        fetchSessionDeckSwimmers(classId),
        fetchInstructorAgenda(sessionDate),
      ])
      setClassMeta(meta)
      setDateKey(sessionDate)
      setSwimmers(roster)
      setSessionSlot(pickSessionForClass(agenda.sessions, classId))
      const attendance = await loadSessionAttendance(classId, sessionDate)
      setMarks(attendance.marks)
      setAttendanceWarning(attendance.warning)
    } catch (err) {
      setError(formatAppError(err))
    } finally {
      setLoading(false)
    }
  }, [classId, dateParam])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!classMeta || !dateKey || swimmers.length === 0) {
      setFitnessByChild(new Map())
      return
    }
    let cancelled = false
    void fetchDeckFitness({
      classId,
      childIds: swimmers.map((swimmer) => swimmer.childId),
      dateKey,
      timeZone: classMeta.timezone,
      startTime: sessionSlot?.startTime ?? null,
    })
      .then((next) => {
        if (!cancelled) setFitnessByChild(next)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(formatAppError(err))
      })
    return () => {
      cancelled = true
    }
  }, [classId, classMeta, dateKey, sessionSlot?.startTime, swimmers])

  async function handleVerbalClearance(childId: string, reason: string) {
    if (!dateKey) return
    setOverrideChildId(childId)
    setError(null)
    try {
      await recordDeckVerbalClearance({ classId, childId, sessionDate: dateKey, reason })
      setFitnessByChild((current) => {
        const next = new Map(current)
        next.set(childId, {
          childId,
          status: 'DECK_CLEARED',
          canOverride: false,
          detail: reason.trim() || 'Verbal deck clearance',
        })
        return next
      })
    } catch (err) {
      setError(formatAppError(err))
    } finally {
      setOverrideChildId(null)
    }
  }

  useEffect(() => {
    if (swimmers.length === 0) {
      setComplianceByKey(new Map())
      return
    }
    let cancelled = false
    void fetchSwimmerFormCompliance(swimmers.map((swimmer) => ({ childId: swimmer.childId, classId })))
      .then((next) => {
        if (!cancelled) setComplianceByKey(next)
      })
      .catch(() => {
        if (!cancelled) setComplianceByKey(new Map())
      })
    return () => {
      cancelled = true
    }
  }, [swimmers, classId])

  const counts = useMemo(() => countAttendance(marks, swimmers.length), [marks, swimmers.length])

  const formPendingByChild = useMemo(() => {
    const pending = new Map<string, boolean>()
    for (const swimmer of swimmers) {
      const compliance = complianceByKey.get(formComplianceKey(swimmer.childId, classId))
      pending.set(swimmer.childId, compliance?.status === 'pending')
    }
    return pending
  }, [swimmers, complianceByKey, classId])

  async function setAttendance(childId: string, next: 'present' | 'absent') {
    if (!dateKey || !user?.id) return
    const previous = marks
    const optimistic = { ...marks, [childId]: next }
    setMarks(optimistic)
    replaceAttendanceMap(classId, dateKey, optimistic)
    try {
      await persistAttendanceMark({
        classId,
        dateKey,
        childId,
        mark: next,
        markedBy: user.id,
      })
      setAttendanceWarning(null)
    } catch (err) {
      if (attendanceTableMissing(err)) {
        setAttendanceWarning(err instanceof Error ? err.message : 'Attendance is still on this device.')
        return
      }
      setMarks(previous)
      replaceAttendanceMap(classId, dateKey, previous)
      setError(formatAppError(err))
    }
  }

  const timeLabel = sessionSlot
    ? formatTimeRange12h(sessionSlot.startTime, sessionSlot.endTime)
    : classMeta?.scheduleDetails?.trim() || 'Session time TBD'

  const locationLabel =
    sessionSlot?.location?.trim() ||
    sessionSlot?.locationDetail?.trim() ||
    classMeta?.location?.trim() ||
    'Location TBD'

  const poolTimeZone = classMeta?.timezone
  const dateHeading = dateKey && poolTimeZone ? calendarDayHeading(dateKey, poolTimeZone) : 'Today'

  const footerDateLabel = dateKey && poolTimeZone ? calendarMonthDayLabel(dateKey, poolTimeZone) : ''

  return (
    <div className="flex min-h-svh flex-col bg-surface text-on-surface">
      <header className="fixed inset-x-0 top-0 z-50 bg-surface/90 pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-2 px-margin-screen">
          <button
            type="button"
            aria-label="Back"
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-primary transition-all hover:bg-surface-container active:scale-95"
            onClick={() =>
              goBack(
                instructorBackTarget(
                  search,
                  dateKey ? `${INSTRUCTOR_HOME_PATH}?date=${dateKey}` : INSTRUCTOR_HOME_PATH,
                ),
              )
            }
          >
            <MaterialIcon name="arrow_back" size={20} />
            <span className="text-label-lg font-bold">Back</span>
          </button>
          <h1 className="min-w-0 flex-1 truncate text-headline-sm">Deck roster</h1>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-margin-screen pb-safe pt-[calc(4rem+env(safe-area-inset-top))]">
        <section className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-30 -mx-margin-screen bg-surface/95 px-margin-screen pb-4 pt-2 shadow-sm backdrop-blur-md">
          {loading ? (
            <p className="py-4 text-body-md text-on-surface-variant">Loading deck…</p>
          ) : (
            <div className="flex flex-col gap-3">
              <h2 className="text-headline-lg-mobile text-on-surface">{classMeta?.name ?? 'Class session'}</h2>
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-1 text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">
                    <MaterialIcon name="calendar_today" size={15} className="text-primary" />
                    {dateHeading}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-fixed px-3 py-1 text-label-sm text-on-primary-fixed-variant">
                    <MaterialIcon name="schedule" size={15} />
                    {timeLabel}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-label-md font-semibold text-on-primary shadow-sm">
                    <MaterialIcon name="pool" size={16} />
                    {locationLabel}
                  </span>
                </div>
                <div className="flex flex-col sm:items-end">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary-container px-3 py-1.5 text-label-lg font-bold text-on-secondary-container shadow-sm">
                    <MaterialIcon name="verified" size={18} />
                    {counts.present}/{swimmers.length} Present
                  </div>
                  <span className="mt-0.5 text-body-sm text-outline">
                    Unmarked do not count towards attendance
                  </span>
                </div>
              </div>

            </div>
          )}
        </section>

        <div className="flex flex-col gap-4 py-5">
          {error ? <p className="text-body-md text-error">{error}</p> : null}
          {!loading ? (
            <DeckRoster
              swimmers={swimmers}
              marks={marks}
              fitnessByChild={fitnessByChild}
              formPendingByChild={formPendingByChild}
              filter={filter}
              onFilter={setFilter}
              overrideChildId={overrideChildId}
              onOpenSwimmer={(childId) =>
                onNavigate(
                  instructorSwimmerPath(childId, {
                    from: instructorSessionPath(classId, dateKey ?? undefined),
                  }),
                )
              }
              onMarkAttendance={(childId, mark) => void setAttendance(childId, mark)}
              onVerbalClearance={(childId, reason) => void handleVerbalClearance(childId, reason)}
              onShare={() =>
                onNavigate(
                  `${instructorShareClassPath(classId)}?from=${encodeURIComponent(
                    instructorSessionPath(classId, dateKey ?? undefined),
                  )}`,
                )
              }
              onLogProgress={(childId) =>
                onNavigate(instructorProgressLogPath({ childId, classId, date: dateKey }))
              }
            />
          ) : null}
        </div>

        {!loading && swimmers.length > 0 ? (
          <footer className="mt-2 flex flex-col items-center gap-1 border-t border-outline-variant/15 pt-4 text-center text-on-surface-variant">
            <div className="flex items-center gap-1.5 text-label-sm">
              <MaterialIcon name={attendanceWarning ? 'cloud_off' : 'cloud_done'} size={16} className="text-secondary" />
              {attendanceWarning ?? `Attendance for ${footerDateLabel} is saved to the class.`}
            </div>
          </footer>
        ) : null}
      </main>
    </div>
  )
}
