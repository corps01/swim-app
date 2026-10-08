import { useCallback, useEffect, useMemo, useState } from 'react'
import { DeckSwimmerCard } from '../../components/instructor/DeckSwimmerCard'
import { useAppPath } from '../../hooks/useAppPath'
import { fetchInstructorAgenda, type AgendaSession } from '../../lib/api/agenda'
import { fetchSessionDeckClass, fetchSessionDeckSwimmers, type SessionDeckSwimmer } from '../../lib/api/sessionDeck'
import { formatTimeRange12h } from '../../lib/classSchedule'
import { formatAppError } from '../../lib/errors'
import { INSTRUCTOR_HOME_PATH, instructorProgressLogPath } from '../../lib/appNavigation'
import {
  countAttendance,
  cycleAttendanceMark,
  getAttendanceMap,
  setAttendanceMark,
  type AttendanceMark,
} from '../../lib/sessionAttendance'
import {
  calendarDayHeading,
  calendarMonthDayLabel,
  formatDeviceCalendarDateKey,
} from '../../lib/timeZone/calendar'
import { useDeviceTimeZone } from '../../lib/timeZone/device'
import { Button, MaterialIcon } from '../../components/ui'
import { cn } from '../../lib/cn'

type DeckFilter = 'all' | 'present' | 'absent' | 'medical'

interface InstructorSessionPageProps {
  classId: string
  onNavigate: (path: string) => void
}

function pickSessionForClass(sessions: AgendaSession[], classId: string): AgendaSession | null {
  return sessions.find((session) => session.classId === classId) ?? null
}

export function InstructorSessionPage({ classId, onNavigate }: InstructorSessionPageProps) {
  const { search, goBack } = useAppPath()
  const deviceTimeZone = useDeviceTimeZone()
  const dateKey =
    new URLSearchParams(search).get('date')?.trim() || formatDeviceCalendarDateKey()

  const [classMeta, setClassMeta] = useState<Awaited<ReturnType<typeof fetchSessionDeckClass>> | null>(
    null,
  )
  const [sessionSlot, setSessionSlot] = useState<AgendaSession | null>(null)
  const [swimmers, setSwimmers] = useState<SessionDeckSwimmer[]>([])
  const [marks, setMarks] = useState<Record<string, AttendanceMark>>({})
  const [filter, setFilter] = useState<DeckFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [meta, roster, agenda] = await Promise.all([
        fetchSessionDeckClass(classId),
        fetchSessionDeckSwimmers(classId),
        fetchInstructorAgenda(dateKey),
      ])
      setClassMeta(meta)
      setSwimmers(roster)
      setSessionSlot(pickSessionForClass(agenda.sessions, classId))
      setMarks(getAttendanceMap(classId, dateKey))
    } catch (err) {
      setError(formatAppError(err))
    } finally {
      setLoading(false)
    }
  }, [classId, dateKey])

  useEffect(() => {
    void load()
  }, [load])

  const counts = useMemo(() => countAttendance(marks, swimmers.length), [marks, swimmers.length])

  const medicalCount = useMemo(
    () => swimmers.filter((swimmer) => swimmer.notes.trim().length > 0).length,
    [swimmers],
  )

  const filteredSwimmers = useMemo(() => {
    return swimmers.filter((swimmer) => {
      const mark = marks[swimmer.childId] ?? 'unmarked'
      if (filter === 'present') return mark === 'present'
      if (filter === 'absent') return mark === 'absent'
      if (filter === 'medical') return swimmer.notes.trim().length > 0
      return true
    })
  }, [swimmers, marks, filter])

  function toggleAttendance(childId: string) {
    const current = marks[childId] ?? 'unmarked'
    const next = cycleAttendanceMark(current)
    setMarks(setAttendanceMark(classId, dateKey, childId, next))
  }

  const timeLabel = sessionSlot
    ? formatTimeRange12h(sessionSlot.startTime, sessionSlot.endTime)
    : classMeta?.scheduleDetails?.trim() || 'Session time TBD'

  const locationLabel =
    sessionSlot?.location?.trim() ||
    sessionSlot?.locationDetail?.trim() ||
    classMeta?.location?.trim() ||
    'Location TBD'

  const dateHeading = calendarDayHeading(dateKey, deviceTimeZone)

  const filterPills: {
    id: DeckFilter
    label: string
    count: number
    dotClass?: string
    icon?: string
  }[] = [
    { id: 'all', label: 'All', count: swimmers.length },
    { id: 'present', label: 'Present', count: counts.present, dotClass: 'bg-secondary' },
    { id: 'absent', label: 'Absent', count: counts.absent, dotClass: 'bg-tertiary' },
    { id: 'medical', label: 'Medical alerts', count: medicalCount, icon: 'medical_services' },
  ]

  const footerDateLabel = calendarMonthDayLabel(dateKey, deviceTimeZone)

  return (
    <div className="flex min-h-svh flex-col bg-surface text-on-surface">
      <header className="fixed inset-x-0 top-0 z-50 bg-surface/90 pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-2 px-margin-screen">
          <button
            type="button"
            aria-label="Back to Today"
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-primary transition-all hover:bg-surface-container active:scale-95"
            onClick={() => goBack(`${INSTRUCTOR_HOME_PATH}?date=${dateKey}`)}
          >
            <MaterialIcon name="arrow_back" size={20} />
            <span className="text-label-lg font-bold">Today</span>
          </button>
          <h1 className="min-w-0 flex-1 truncate text-center text-headline-sm">Deck roster</h1>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
            <MaterialIcon name="person" size={18} />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-margin-screen pb-safe pt-[calc(4rem+env(safe-area-inset-top))]">
        <section className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-30 -mx-margin-screen bg-surface/95 px-margin-screen pb-4 pt-2 shadow-sm backdrop-blur-md">
          {loading ? (
            <p className="py-4 text-body-md text-on-surface-variant">Loading deck…</p>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-1 text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">
                    <MaterialIcon name="calendar_today" size={15} className="text-primary" />
                    {dateHeading}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-fixed px-3 py-1 text-label-sm text-on-primary-fixed-variant">
                    <MaterialIcon name="schedule" size={15} />
                    {timeLabel}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-label-md font-semibold text-on-primary shadow-sm">
                  <MaterialIcon name="pool" size={16} />
                  {locationLabel}
                </span>
              </div>

              <div className="flex flex-col justify-between gap-2 pt-1 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-headline-lg-mobile text-on-surface">
                    {classMeta?.name ?? 'Class session'}
                  </h2>
                  <p className="text-body-sm text-on-surface-variant">Deck attendance &amp; safety status</p>
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

              <div
                className="flex gap-2 overflow-x-auto pt-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="tablist"
                aria-label="Roster filters"
              >
                {filterPills.map((pill) => {
                  const active = filter === pill.id
                  return (
                    <button
                      key={pill.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setFilter(pill.id)}
                      className={cn(
                        'flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-label-md font-semibold transition-transform active:scale-95',
                        active
                          ? 'bg-primary text-on-primary shadow-sm'
                          : 'bg-surface-container text-on-surface hover:bg-surface-container-high',
                      )}
                    >
                      {pill.dotClass ? (
                        <span className={cn('size-2 rounded-full', pill.dotClass)} aria-hidden />
                      ) : null}
                      {pill.icon ? (
                        <MaterialIcon name={pill.icon} size={16} className="text-tertiary" />
                      ) : null}
                      <span>{pill.label}</span>
                      <span
                        className={cn(
                          'flex size-5 items-center justify-center rounded-full text-[11px] font-bold',
                          active ? 'bg-on-primary/20' : 'bg-surface-dim text-on-surface-variant',
                          pill.id === 'medical' && !active && 'bg-tertiary-fixed text-on-tertiary-fixed',
                        )}
                      >
                        {pill.count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        <div className="flex flex-col gap-4 py-5">
          {error ? <p className="text-body-md text-error">{error}</p> : null}

          {!loading && swimmers.length === 0 ? (
            <p className="text-body-md text-on-surface-variant">
              No swimmers enrolled in this class yet. Share your class code from Classes.
            </p>
          ) : null}

          {!loading && swimmers.length > 0 && filteredSwimmers.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl bg-surface-container-low px-6 py-12 text-center">
              <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-surface-container-high text-primary">
                <MaterialIcon name="search_off" size={28} />
              </div>
              <h4 className="text-headline-sm text-on-surface">No swimmers match this filter</h4>
              <p className="mt-1 max-w-xs text-body-md text-on-surface-variant">
                Try selecting All or check attendance toggles on each card.
              </p>
              <Button type="button" className="mt-4 rounded-full" onClick={() => setFilter('all')}>
                Reset to all swimmers
              </Button>
            </div>
          ) : null}

          {filteredSwimmers.map((swimmer) => (
            <DeckSwimmerCard
              key={swimmer.childId}
              swimmer={swimmer}
              mark={marks[swimmer.childId] ?? 'unmarked'}
              onToggleAttendance={() => toggleAttendance(swimmer.childId)}
              onLogProgress={() =>
                onNavigate(
                  instructorProgressLogPath({
                    childId: swimmer.childId,
                    classId,
                    date: dateKey,
                  }),
                )
              }
            />
          ))}
        </div>

        {!loading && swimmers.length > 0 ? (
          <footer className="mt-2 flex flex-col items-center gap-1 border-t border-outline-variant/15 pt-4 text-center text-on-surface-variant">
            <div className="flex items-center gap-1.5 text-label-sm">
              <MaterialIcon name="cloud_done" size={16} className="text-secondary" />
              Attendance is saved locally on this device for {footerDateLabel}.
            </div>
            <p className="max-w-sm text-body-sm text-outline">
              Deck mode keeps session attendance on this device until you sync from the lobby network.
            </p>
          </footer>
        ) : null}
      </main>
    </div>
  )
}
