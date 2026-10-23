import { useEffect, useMemo, useState } from 'react'
import { fetchParentClassOutlook, type ParentClassOutlook } from '../../lib/api/budsClearance'
import { consumeQuestionnaireSigned } from '../../lib/questionnaireNotice'
import { formatAppError } from '../../lib/errors'
import { ProfileAvatar } from '../../components/ui'
import { ParentShell } from '../../components/navigation/ParentShell'
import { TodayChildCard, type TodayBudsState } from '../../components/parent/TodayChildCard'
import { useAuth } from '../../hooks/useAuth'
import { useAppPath } from '../../hooks/useAppPath'
import { useParentSwimmers } from '../../hooks/useParentSwimmers'
import {
  parentBudsPath,
  parentEnrollPath,
  parentSwimmerClassPath,
  parentSwimmerPath,
  PARENT_FORM_SIGNED_PARAM,
  PARENT_HOME_PATH,
} from '../../lib/appNavigation'
import { ageFromDateOfBirth, type SwimmerRosterEntry } from '../../lib/swimmers'
import { DriftWaves } from '../../components/graphics/DriftWaves'
import { Badge, Button, Card, MaterialIcon } from '../../components/ui'

interface TodayHomeProps {
  onNavigate: (path: string) => void
}

interface TodayLesson {
  swimmer: SwimmerRosterEntry
  outlook: ParentClassOutlook
  location: string | null
  instructorName: string | null
}

export function TodayHome({ onNavigate }: TodayHomeProps) {
  const { user } = useAuth()
  const { search, replace } = useAppPath()
  const parentId = user?.id
  const { swimmers, loading, error } = useParentSwimmers(parentId)
  const [outlook, setOutlook] = useState<ParentClassOutlook[]>([])
  const [outlookError, setOutlookError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [focusedChildId, setFocusedChildId] = useState<string | null>(null)

  useEffect(() => {
    const fromQuery = new URLSearchParams(search).get(PARENT_FORM_SIGNED_PARAM) === '1'
    const fromStore = consumeQuestionnaireSigned()
    if (!fromQuery && !fromStore) return
    setToast('Daily check-in saved.')
    if (fromQuery) replace(PARENT_HOME_PATH)
  }, [search, replace])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const enrollments = swimmers.flatMap((swimmer) =>
      swimmer.enrollments.flatMap((enrollment) =>
        enrollment.status === 'active' && enrollment.classId
          ? [
              {
                childId: swimmer.id,
                classId: enrollment.classId,
                swimmerName: `${swimmer.firstName} ${swimmer.lastName}`.trim(),
              },
            ]
          : [],
      ),
    )
    if (enrollments.length === 0) {
      setOutlook([])
      setOutlookError(null)
      return
    }
    let cancelled = false
    void fetchParentClassOutlook(enrollments)
      .then((rows) => {
        if (cancelled) return
        setOutlook(rows)
        setOutlookError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setOutlook([])
          setOutlookError(formatAppError(err))
        }
      })
    return () => {
      cancelled = true
    }
  }, [swimmers])

  const greeting = useMemo(() => (user?.fullName || 'there').split(' ')[0] || 'there', [user?.fullName])

  const todayLessons = useMemo(() => {
    const lessons: TodayLesson[] = []
    for (const swimmer of swimmers) {
      const todays = outlook
        .filter((row) => row.childId === swimmer.id && row.meetsToday && row.classStartsAt)
        .sort((a, b) => (a.classStartsAt ?? '').localeCompare(b.classStartsAt ?? ''))
      const nextUp = todays[0]
      if (!nextUp) continue
      const enrollment = swimmer.enrollments.find((row) => row.classId === nextUp.classId)
      lessons.push({
        swimmer,
        outlook: nextUp,
        location: enrollment?.location ?? null,
        instructorName: enrollment?.instructorName ?? null,
      })
    }
    lessons.sort((a, b) => {
      const aMissing = a.outlook.status === 'MISSING' ? 0 : 1
      const bMissing = b.outlook.status === 'MISSING' ? 0 : 1
      if (aMissing !== bMissing) return aMissing - bMissing
      return (a.outlook.classStartsAt ?? '').localeCompare(b.outlook.classStartsAt ?? '')
    })
    return lessons
  }, [outlook, swimmers])

  const otherChildren = useMemo(() => {
    const todayIds = new Set(todayLessons.map((lesson) => lesson.swimmer.id))
    return swimmers
      .filter((swimmer) => !todayIds.has(swimmer.id))
      .map((swimmer) => {
        const upcoming = outlook
          .filter((row) => row.childId === swimmer.id && !row.meetsToday && row.nextLabel)
          .sort((a, b) => (a.nextStartsAt ?? '').localeCompare(b.nextStartsAt ?? ''))
        return {
          swimmer,
          nextLabel: upcoming[0]?.nextLabel ?? null,
          className: upcoming[0]?.className ?? null,
        }
      })
  }, [outlook, swimmers, todayLessons])

  const salutation = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])
  const classCount = useMemo(() => {
    const ids = new Set<string>()
    for (const swimmer of swimmers) {
      for (const enrollment of swimmer.enrollments) {
        if (enrollment.classId && enrollment.status !== 'inactive') ids.add(enrollment.classId)
      }
    }
    return ids.size
  }, [swimmers])
  const visibleLessons = focusedChildId
    ? todayLessons.filter((lesson) => lesson.swimmer.id === focusedChildId)
    : todayLessons
  const visibleOthers = focusedChildId
    ? otherChildren.filter(({ swimmer }) => swimmer.id === focusedChildId)
    : otherChildren
  const pendingForms = todayLessons.filter((lesson) => lesson.outlook.status === 'MISSING').length

  return (
    <ParentShell activePath={PARENT_HOME_PATH} onNavigate={onNavigate} screenTitle="Today">
      <div className="flex flex-col gap-stack-loose pb-8 pt-2">
        <section className="relative overflow-hidden rounded-lg bg-surface-container-lowest p-card-padding shadow-[0_4px_16px_-2px_rgba(8,145,178,0.08),0_2px_6px_-1px_rgba(15,23,42,0.04)]">
          <div
            className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-primary-fixed/20 blur-2xl"
            aria-hidden
          />
          <DriftWaves align="end" />
          <div className="relative z-10 flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1 truncate text-label-sm text-primary">
                <MaterialIcon name="pool" size={16} className="shrink-0" />
                <span className="truncate">Family home</span>
              </span>
              {todayLessons.length > 0 ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary-fixed/50 px-2.5 py-0.5 text-label-sm font-semibold text-on-secondary-fixed-variant">
                  <span className="size-1.5 animate-pulse rounded-full bg-secondary" aria-hidden />
                  On deck today
                </span>
              ) : null}
            </div>
            <h2 className="mt-0.5 text-headline-lg-mobile tracking-tight text-on-surface">
              {salutation}, {greeting}
            </h2>
            <div className="mt-3 flex items-center gap-2 rounded-2xl bg-surface-container-low/70 p-2.5 pt-3">
              <WelcomeMetric icon="class" label="Classes" value={classCount} />
              <div className="h-6 w-px bg-outline-variant/30" aria-hidden />
              <WelcomeMetric icon="groups" label="Swimmers" value={swimmers.length} variant="fixed" />
              <div className="h-6 w-px bg-outline-variant/30" aria-hidden />
              <WelcomeMetric icon="assignment_late" label="Forms" value={pendingForms} variant="alert" />
            </div>
          </div>
        </section>

        {swimmers.length > 0 ? (
          <div className="-mt-2 flex items-center gap-2.5 overflow-x-auto py-1" role="group" aria-label="Filter by child">
            {swimmers.map((swimmer) => {
              const selected = focusedChildId === swimmer.id
              const lesson = todayLessons.find((row) => row.swimmer.id === swimmer.id)
              const needsForm = lesson?.outlook.status === 'MISSING'
              return (
                <button
                  key={swimmer.id}
                  type="button"
                  aria-pressed={selected}
                  className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 transition-all ${
                    selected
                      ? 'bg-primary text-on-primary shadow-[0_4px_14px_rgba(0,100,124,0.25)]'
                      : 'bg-surface-container-lowest text-on-surface-variant shadow-[0_2px_8px_rgba(0,100,124,0.06)]'
                  }`}
                  onClick={() => setFocusedChildId(selected ? null : swimmer.id)}
                >
                  <ProfileAvatar firstName={swimmer.firstName} lastName={swimmer.lastName} size="xs" />
                  <span className="text-label-md font-bold">{swimmer.firstName.trim() || 'Swimmer'}</span>
                  <span
                    className={`size-2 rounded-full ${
                      needsForm ? 'animate-pulse bg-tertiary-container' : lesson ? 'bg-secondary' : 'bg-outline-variant'
                    }`}
                  />
                </button>
              )
            })}
            <button
              type="button"
              aria-label="Enroll a child"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-primary"
              onClick={() => onNavigate(parentEnrollPath({ from: PARENT_HOME_PATH }))}
            >
              <MaterialIcon name="add" size={20} />
            </button>
          </div>
        ) : null}

        {error || outlookError ? (
          <p role="alert" className="rounded-2xl bg-error-container px-3 py-2 text-body-sm text-on-error-container">
            {error ?? outlookError}
          </p>
        ) : null}

        {loading ? (
          <p className="text-body-md text-on-surface-variant">Checking today’s lessons…</p>
        ) : swimmers.length === 0 ? (
          <Card variant="outline" className="items-center gap-3 rounded-3xl border-dashed py-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary-fixed/50 text-primary">
              <MaterialIcon name="person_add" size={28} />
            </div>
            <div>
              <h3 className="text-headline-sm text-on-surface">No swimmers yet</h3>
              <p className="mx-auto mt-1 max-w-xs text-body-sm text-on-surface-variant">
                Enroll a child with your instructor’s class code to see lessons here.
              </p>
            </div>
            <Button type="button" className="rounded-full" onClick={() => onNavigate(parentEnrollPath({ from: PARENT_HOME_PATH }))}>
              <MaterialIcon name="add_circle" size={18} />
              Enroll a child
            </Button>
          </Card>
        ) : (
          <>
            <section className="flex flex-col gap-3" aria-label="Today's lessons">
              <h3 className="text-headline-sm text-on-surface">Today&apos;s lessons</h3>
              {visibleLessons.length === 0 ? (
                <Card variant="outline" className="items-center gap-2 rounded-3xl border-dashed py-6 text-center">
                  <MaterialIcon name="event_available" size={28} className="text-primary" />
                  <p className="text-body-sm text-on-surface-variant">No lesson on the schedule today.</p>
                </Card>
              ) : (
                <ul className="grid grid-cols-1 gap-stack-base lg:grid-cols-2">
                  {visibleLessons.map((lesson) => {
                    const buds: TodayBudsState | null =
                      lesson.outlook.templateId && lesson.outlook.status
                        ? {
                            status: lesson.outlook.status,
                            clearanceTimeLabel: lesson.outlook.clearanceTimeLabel,
                            reasons: lesson.outlook.reasons,
                          }
                        : null
                    return (
                      <li key={lesson.swimmer.id} className="min-w-0">
                        <TodayChildCard
                          child={{
                            id: lesson.swimmer.id,
                            firstName: lesson.swimmer.firstName,
                            lastName: lesson.swimmer.lastName,
                            age: ageFromDateOfBirth(lesson.swimmer.dateOfBirth),
                          }}
                          todayClass={{
                            classId: lesson.outlook.classId,
                            className: lesson.outlook.className,
                            location: lesson.location,
                            instructorName: lesson.instructorName,
                            startLabel: lesson.outlook.classTimeLabel ?? 'Time not set',
                            endLabel: lesson.outlook.classEndLabel,
                            startsAt: lesson.outlook.classStartsAt ?? '',
                          }}
                          budsSubmission={buds}
                          onOpenChild={() =>
                            onNavigate(parentSwimmerPath(lesson.swimmer.id, { from: PARENT_HOME_PATH }))
                          }
                          onOpenClass={() =>
                            onNavigate(
                              parentSwimmerClassPath(lesson.swimmer.id, lesson.outlook.classId, {
                                from: PARENT_HOME_PATH,
                              }),
                            )
                          }
                          onCompleteForm={() => {
                            if (!lesson.outlook.templateId) return
                            onNavigate(
                              parentBudsPath(lesson.swimmer.id, lesson.outlook.classId, lesson.outlook.templateId),
                            )
                          }}
                        />
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            {visibleOthers.length > 0 ? (
              <section className="flex flex-col gap-3" aria-label="Upcoming and other children">
                <h3 className="text-headline-sm text-on-surface">Upcoming &amp; other children</h3>
                <ul className="grid grid-cols-1 gap-stack-base lg:grid-cols-2">
                  {visibleOthers.map(({ swimmer, nextLabel, className }) => {
                    const age = ageFromDateOfBirth(swimmer.dateOfBirth)
                    return (
                      <li key={swimmer.id}>
                        <button
                          type="button"
                          onClick={() => onNavigate(parentSwimmerPath(swimmer.id, { from: PARENT_HOME_PATH }))}
                          className="flex w-full min-w-0 items-center gap-3 rounded-3xl bg-surface-container-lowest p-4 text-left shadow-[0_4px_16px_-2px_rgba(0,100,124,0.08)]"
                        >
                          <ProfileAvatar firstName={swimmer.firstName} lastName={swimmer.lastName} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-label-lg text-on-surface">
                                {swimmer.firstName} {swimmer.lastName}
                              </p>
                              <Badge tone="neutral" size="sm">
                                No class today
                              </Badge>
                            </div>
                            <p className="truncate text-body-sm text-on-surface-variant">
                              {nextLabel
                                ? `Next: ${[className, nextLabel].filter(Boolean).join(' · ')}`
                                : age != null
                                  ? `${age} years old · No upcoming class`
                                  : 'No upcoming class'}
                            </p>
                          </div>
                          <MaterialIcon name="chevron_right" size={20} className="shrink-0 text-outline" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </div>

      {toast ? (
        <div
          className="pointer-events-none fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-on-surface/95 px-4 py-2.5 text-label-sm font-semibold text-surface-container-lowest shadow-lg backdrop-blur md:bottom-8"
          role="status"
        >
          <MaterialIcon name="check_circle" size={16} className="text-secondary-container" filled />
          {toast}
        </div>
      ) : null}
    </ParentShell>
  )
}

function WelcomeMetric({
  icon,
  label,
  value,
  variant = 'default',
}: {
  icon: string
  label: string
  value: number
  variant?: 'default' | 'fixed' | 'alert'
}) {
  const iconWrap =
    variant === 'fixed'
      ? 'bg-primary-fixed text-on-primary-fixed-variant'
      : variant === 'alert'
        ? 'bg-tertiary-fixed text-tertiary'
        : 'bg-primary/10 text-primary'
  const valueClass = variant === 'alert' && value > 0 ? 'text-tertiary' : 'text-on-surface'

  return (
    <div className="flex flex-1 items-center gap-2 pl-1">
      <div className={`flex size-8 items-center justify-center rounded-full ${iconWrap}`}>
        <MaterialIcon name={icon} size={18} />
      </div>
      <div className="flex flex-col leading-none">
        <span className={`text-headline-sm ${valueClass}`}>{value}</span>
        <span className="text-label-sm text-on-surface-variant">{label}</span>
      </div>
    </div>
  )
}
