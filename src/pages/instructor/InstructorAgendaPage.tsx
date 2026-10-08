import { useCallback, useEffect, useMemo, useState } from 'react'
import { AgendaSessionCard } from '../../components/instructor/AgendaSessionCard'
import { InstructorAgendaHeroCard } from '../../components/instructor/InstructorAgendaHeroCard'
import { InstructorDailyPromptBanner } from '../../components/instructor/InstructorDailyPromptBanner'
import { InstructorShell } from '../../components/navigation/InstructorShell'
import { useAppPath } from '../../hooks/useAppPath'
import { useAuth } from '../../hooks/useAuth'
import { useInstructorClasses } from '../../hooks/useInstructorClasses'
import {
  fetchInstructorAgenda,
  type AgendaSession,
} from '../../lib/api/agenda'
import {
  pickNextSessionId,
  sessionCardKey,
  timingBadgeForSession,
} from '../../lib/agendaSessionTiming'
import { INSTRUCTOR_CLASSES_PATH, INSTRUCTOR_HOME_PATH, instructorSessionPath } from '../../lib/appNavigation'
import { formatAppError } from '../../lib/errors'
import { groupAgendaSessions, type AgendaShiftId } from '../../lib/instructorAgendaLayout'
import {
  addCalendarDays,
  calendarDayHeading,
  calendarWeekdayLong,
  calendarWeekdayShort,
  calendarDayOfMonth,
  formatDeviceCalendarDateKey,
  isCalendarDateKey,
} from '../../lib/timeZone/calendar'
import { useDeviceTimeZone } from '../../lib/timeZone/device'
import { Button, MaterialIcon } from '../../components/ui'
import { cn } from '../../lib/cn'

interface InstructorAgendaPageProps {
  onNavigate: (path: string) => void
  onNewClass: () => void
}

const SHIFT_ICONS: Record<AgendaShiftId, string> = {
  morning: 'wb_sunny',
  afternoon: 'wb_twilight',
  evening: 'nights_stay',
}

function facilityLabelFromSessions(sessions: AgendaSession[], classes: { location: string | null }[]): string {
  const fromSession = sessions.find((s) => s.location?.trim())?.location?.trim()
  if (fromSession) return fromSession
  const fromClass = classes.find((c) => c.location?.trim())?.location?.trim()
  return fromClass ?? 'Your pool schedule'
}

export function InstructorAgendaPage({ onNavigate, onNewClass }: InstructorAgendaPageProps) {
  const { search, replace } = useAppPath()
  const { user } = useAuth()
  const instructorName = user?.fullName ?? 'Coach'
  const instructorId = user?.id
  const { classes } = useInstructorClasses(instructorId)
  const deviceTimeZone = useDeviceTimeZone()

  const [agenda, setAgenda] = useState<Awaited<ReturnType<typeof fetchInstructorAgenda>> | null>(
    null,
  )

  const todayKey = formatDeviceCalendarDateKey()
  const urlDate = new URLSearchParams(search).get('date')
  const selectedDate = isCalendarDateKey(urlDate) ? urlDate : todayKey
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isToday = selectedDate === todayKey

  useEffect(() => {
    if (urlDate === selectedDate) return
    replace(`${INSTRUCTOR_HOME_PATH}?date=${selectedDate}`)
  }, [replace, selectedDate, urlDate])
  const sessions = agenda?.sessions ?? []

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [sessions],
  )

  const shiftGroups = useMemo(() => groupAgendaSessions(sortedSessions), [sortedSessions])

  const nextSessionKey = useMemo(
    () => pickNextSessionId(sortedSessions, isToday),
    [sortedSessions, isToday],
  )

  const facilityLabel = useMemo(
    () => facilityLabelFromSessions(sortedSessions, classes),
    [sortedSessions, classes],
  )

  const dayStrip = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const key = addCalendarDays(todayKey, index, deviceTimeZone)
      const isTodayColumn = key === todayKey
      const isRest = !isTodayColumn && key !== selectedDate
      return {
        key,
        weekday: calendarWeekdayShort(key, deviceTimeZone),
        dayNum: calendarDayOfMonth(key, deviceTimeZone),
        isRest,
        isToday: isTodayColumn,
      }
    })
  }, [deviceTimeZone, todayKey, selectedDate])

  const loadAgenda = useCallback(async (dateKey: string) => {
    setLoading(true)
    setError(null)
    try {
      const next = await fetchInstructorAgenda(dateKey)
      setAgenda(next)
    } catch (err) {
      setAgenda(null)
      setError(formatAppError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAgenda(selectedDate)
  }, [loadAgenda, selectedDate])

  const openClasses = () => onNavigate(INSTRUCTOR_CLASSES_PATH)

  return (
    <InstructorShell activeTab="agenda" onNavigate={onNavigate} instructorName={instructorName}>
      <section className="px-margin-screen pb-2 pt-4">
        <InstructorAgendaHeroCard
          instructorName={instructorName}
          timeZone={deviceTimeZone}
          sessions={sortedSessions}
          facilityLabel={facilityLabel}
        />
      </section>

      {isToday ? (
        <InstructorDailyPromptBanner
          dateKey={selectedDate}
          className="mx-margin-screen mb-2 mt-3"
          onLogProgress={() => {
            const target = sortedSessions[0]
            if (target) {
              onNavigate(instructorSessionPath(target.classId, selectedDate))
            } else {
              onNavigate(INSTRUCTOR_CLASSES_PATH)
            }
          }}
        />
      ) : null}

      <section className="mt-4 flex flex-col gap-2">
        <div className="flex items-center justify-between px-margin-screen">
          <div className="flex items-baseline gap-2">
            <h3 className="text-headline-sm text-on-surface">{calendarDayHeading(selectedDate, deviceTimeZone)}</h3>
            <span className="text-label-sm font-bold uppercase tracking-wider text-primary">
              {calendarWeekdayLong(selectedDate, deviceTimeZone)}
            </span>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 rounded-full bg-surface-container-high px-3 py-1.5 text-label-md text-primary transition-transform active:scale-95"
            onClick={openClasses}
          >
            <MaterialIcon name="calendar_view_week" size={16} />
            Classes
          </button>
        </div>

        <div className="flex gap-2.5 overflow-x-auto scroll-smooth px-margin-screen py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {dayStrip.map((day) => {
            const active = day.key === selectedDate
            return (
              <button
                key={day.key}
                type="button"
                onClick={() => replace(`${INSTRUCTOR_HOME_PATH}?date=${day.key}`)}
                className={cn(
                  'flex w-14 shrink-0 flex-col items-center justify-center rounded-2xl py-2.5 transition-all active:scale-95',
                  active
                    ? 'bg-primary text-on-primary shadow-[0_8px_20px_-4px_rgba(0,100,124,0.35)]'
                    : day.isRest
                      ? 'bg-surface-container-low text-on-surface-variant'
                      : 'bg-surface-container-lowest text-on-surface shadow-sm',
                )}
              >
                <span
                  className={cn(
                    'text-label-sm',
                    active ? 'font-bold text-primary-fixed' : 'text-on-surface-variant',
                  )}
                >
                  {day.weekday}
                </span>
                <span className={cn('mt-0.5 text-headline-sm', active && 'text-on-primary')}>
                  {day.dayNum}
                </span>
                <span
                  className={cn(
                    'mt-1 rounded-full',
                    day.isToday ? 'size-2 bg-secondary' : 'size-1.5 bg-outline-variant',
                  )}
                  aria-hidden
                />
              </button>
            )
          })}
        </div>
      </section>

      {error ? (
        <p className="px-margin-screen pb-2 pt-2 text-body-md text-error">{error}</p>
      ) : null}

      <section className="mt-4 flex flex-col gap-4 px-margin-screen pb-8">
        {loading ? (
          <p className="text-body-md text-on-surface-variant">Loading agenda…</p>
        ) : error ? null : sortedSessions.length === 0 ? (
          <div className="relative flex flex-col items-center overflow-hidden rounded-lg bg-surface-container-low p-card-padding text-center shadow-sm">
            <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-primary-fixed text-primary">
              <MaterialIcon name="water" size={30} />
            </div>
            <span className="mb-1 rounded-full bg-surface-container-highest px-2.5 py-0.5 text-label-sm uppercase tracking-wider text-on-surface-variant">
              {isToday ? 'Rest day' : 'No sessions'} · {calendarDayHeading(selectedDate, deviceTimeZone)}
            </span>
            <h4 className="text-headline-sm font-bold text-on-surface">No classes scheduled</h4>
            <p className="mt-1 max-w-xs text-body-md text-on-surface-variant">
              Add session times on a class, or open your full class list to manage codes and swimmers.
            </p>
            <div className="mt-4 flex w-full flex-wrap justify-center gap-2">
              <Button type="button" variant="secondary" className="min-w-[140px] flex-1 rounded-full" onClick={openClasses}>
                <MaterialIcon name="calendar_month" size={18} />
                All classes
              </Button>
              <Button type="button" className="min-w-[140px] flex-1 rounded-full" onClick={onNewClass}>
                <MaterialIcon name="add" size={18} />
                Create class
              </Button>
            </div>
          </div>
        ) : (
          shiftGroups.map((group) => (
            <section key={group.shift} className="flex flex-col gap-3" aria-label={group.title}>
              <header className="flex items-center justify-between gap-3 rounded-2xl bg-on-surface px-4 py-3 text-surface-container-lowest">
                <div className="flex min-w-0 items-center gap-2">
                  <MaterialIcon name={SHIFT_ICONS[group.shift]} size={20} filled />
                  <h4 className="text-headline-sm font-extrabold">{group.title}</h4>
                </div>
                <span className="shrink-0 text-label-md font-bold tracking-wide">
                  {group.timeRangeLabel}
                </span>
              </header>

              {group.locationGroups.map((locationGroup) => (
                <div key={locationGroup.locationKey} className="flex flex-col gap-3">
                  <h5 className="flex items-center gap-2 border-l-4 border-primary bg-surface-container-high px-3 py-2 text-label-md font-bold uppercase tracking-wider text-on-surface">
                    <MaterialIcon name="pool" size={16} className="text-primary" />
                    {locationGroup.locationLabel}
                  </h5>
                  {locationGroup.sessions.map((session) => {
                    const key = sessionCardKey(session)
                    return (
                      <AgendaSessionCard
                        key={key}
                        session={session}
                        timingBadge={timingBadgeForSession(session, nextSessionKey, isToday)}
                        emphasize={nextSessionKey === key}
                        onOpen={() =>
                          onNavigate(instructorSessionPath(session.classId, selectedDate))
                        }
                      />
                    )
                  })}
                </div>
              ))}
            </section>
          ))
        )}
      </section>
    </InstructorShell>
  )
}
