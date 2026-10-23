import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchProgressLogsForChild, type ProgressLog } from '../../lib/api/progressLogs'
import { fetchCheersForLogs, setProgressCheer, type ProgressCheerState } from '../../lib/api/progressCheers'
import { fetchChildFormHistory, fetchParentClassForms, formComplianceKey, type ChildFormHistoryItem } from '../../lib/api/forms'
import type { ParentClassForm } from '../../types/questionnaire'
import { FormComplianceBadge } from '../../components/instructor/FormComplianceBadge'
import { leaveClassEnrollment } from '../../lib/api/parentEnrollment'
import { fetchParentSwimmers } from '../../lib/api/swimmers'
import { ageFromDateOfBirth, formatDateOfBirth, swimmerHasActiveClass, type SwimmerRosterEntry } from '../../lib/swimmers'
import { formatProgressLogWhen, splitProgressNote } from '../../lib/progressLogDisplay'
import { formatSeasonRangeLabel } from '../../lib/classSchedule'
import { formatAppError } from '../../lib/errors'
import {
  parentBackTarget,
  parentEditSwimmerPath,
  parentEnrollPath,
  parentQuestionnairePath,
  parentSwimmerClassPath,
  parentSwimmerPath,
  PARENT_SWIMMERS_PATH,
} from '../../lib/appNavigation'
import { useAppPath } from '../../hooks/useAppPath'
import { useAuth } from '../../hooks/useAuth'
import { WavyImageFrame } from '../../components/common/WavyImageFrame'
import { Badge, Button, MaterialIcon, ProfileAvatar } from '../../components/ui'
import { cn } from '../../lib/cn'

type HubTab = 'activity' | 'classes' | 'waivers'
type ActivityFilter = 'all' | 'photos' | 'notes'

interface SwimmerDetailProps {
  childId: string
  onNavigate: (path: string) => void
}

function signedLabel(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Signed'
  return `Signed ${date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`
}

export function SwimmerDetail({ childId, onNavigate }: SwimmerDetailProps) {
  const { search, goBack } = useAppPath()
  const { user } = useAuth()
  const parentId = user?.id
  const backTarget = useMemo(() => parentBackTarget(search, PARENT_SWIMMERS_PATH), [search])

  const [tab, setTab] = useState<HubTab>('activity')
  const [swimmer, setSwimmer] = useState<SwimmerRosterEntry | null>(null)
  const [logs, setLogs] = useState<ProgressLog[]>([])
  const [cheers, setCheers] = useState<Map<string, ProgressCheerState>>(new Map())
  const [forms, setForms] = useState<ChildFormHistoryItem[]>([])
  const [classForms, setClassForms] = useState<Map<string, ParentClassForm[]>>(new Map())
  const [cheerBusyId, setCheerBusyId] = useState<string | null>(null)
  const [leavingClassId, setLeavingClassId] = useState<string | null>(null)
  const [confirmLeaveId, setConfirmLeaveId] = useState<string | null>(null)
  const [dailyOpen, setDailyOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<ActivityFilter>('all')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!parentId) return
    setLoading(true)
    setError(null)
    try {
      const swimmers = await fetchParentSwimmers(parentId)
      const match = swimmers.find((row) => row.id === childId) ?? null
      setSwimmer(match)
      const classIds = (match?.enrollments ?? []).flatMap((row) => (row.classId ? [row.classId] : []))
      const [rows, history, assigned] = await Promise.all([
        fetchProgressLogsForChild(childId),
        fetchChildFormHistory(childId),
        classIds.length > 0
          ? fetchParentClassForms(classIds.map((classId) => ({ childId, classId })))
          : Promise.resolve(new Map<string, ParentClassForm[]>()),
      ])
      setLogs(rows)
      setForms(history)
      setClassForms(assigned)
      setCheers(await fetchCheersForLogs(rows.map((row) => row.id), parentId))
    } catch (err) {
      setError(formatAppError(err))
      setLogs([])
      setForms([])
    } finally {
      setLoading(false)
    }
  }, [childId, parentId])

  useEffect(() => {
    void load()
  }, [load])

  async function toggleCheer(logId: string) {
    if (!parentId || cheerBusyId) return
    const current = cheers.get(logId) ?? { count: 0, cheeredByMe: false }
    const nextCheered = !current.cheeredByMe
    setCheerBusyId(logId)
    setCheers((prev) => {
      const copy = new Map(prev)
      copy.set(logId, {
        count: Math.max(0, current.count + (nextCheered ? 1 : -1)),
        cheeredByMe: nextCheered,
      })
      return copy
    })
    try {
      await setProgressCheer(logId, parentId, nextCheered)
    } catch (err) {
      setCheers((prev) => {
        const copy = new Map(prev)
        copy.set(logId, current)
        return copy
      })
      setError(formatAppError(err))
    } finally {
      setCheerBusyId(null)
    }
  }

  async function confirmLeave(classId: string) {
    if (!parentId) return
    setLeavingClassId(classId)
    setError(null)
    try {
      await leaveClassEnrollment(parentId, childId, classId)
      setConfirmLeaveId(null)
      await load()
    } catch (err) {
      setError(formatAppError(err))
    } finally {
      setLeavingClassId(null)
    }
  }

  const age = swimmer ? ageFromDateOfBirth(swimmer.dateOfBirth) : null
  const fullName = swimmer ? `${swimmer.firstName} ${swimmer.lastName}`.trim() : 'Swimmer'
  const enrolled = swimmer ? swimmerHasActiveClass(swimmer) : false
  const classes = swimmer?.enrollments.filter((row) => row.classId && row.status !== 'inactive') ?? []
  const waivers = forms.filter((row) => !row.daily)
  const dailyLogs = forms.filter((row) => row.daily)

  const counts = useMemo(
    () => ({
      all: logs.length,
      photos: logs.filter((row) => Boolean(row.photoUrl)).length,
      notes: logs.filter((row) => Boolean(row.note?.trim())).length,
    }),
    [logs],
  )
  const filteredLogs = useMemo(() => {
    if (filter === 'photos') return logs.filter((row) => row.photoUrl)
    if (filter === 'notes') return logs.filter((row) => row.note?.trim())
    return logs
  }, [logs, filter])

  const tabs: { id: HubTab; label: string }[] = [
    { id: 'activity', label: 'Activity & photos' },
    { id: 'classes', label: 'Classes & schedule' },
    { id: 'waivers', label: 'Waivers' },
  ]

  return (
    <div className="flex min-h-svh flex-col bg-surface text-on-surface">
      <header className="fixed inset-x-0 top-0 z-50 bg-surface/85 pt-safe shadow-[0_4px_16px_-2px_rgba(0,100,124,0.06)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-lg items-center gap-2 px-margin-screen">
          <button
            type="button"
            aria-label="Back"
            className="flex h-11 shrink-0 items-center gap-1 rounded-full px-2 text-primary hover:bg-surface-container"
            onClick={() => goBack(backTarget)}
          >
            <MaterialIcon name="arrow_back" size={22} />
            <span className="text-label-md">Back</span>
          </button>
          <h1 className="min-w-0 flex-1 truncate text-headline-sm">{fullName}</h1>
          <button
            type="button"
            className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full bg-surface-container-low px-3 text-label-md text-primary"
            onClick={() => onNavigate(parentEditSwimmerPath(childId))}
          >
            <MaterialIcon name="edit" size={16} />
            Edit profile
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-margin-screen pb-safe pt-[calc(4rem+env(safe-area-inset-top))]">
        <section className="relative mt-3 overflow-hidden rounded-3xl bg-surface-container-lowest p-card-padding shadow-[0_4px_16px_-2px_rgba(0,100,124,0.08)]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-3.5">
              <ProfileAvatar firstName={swimmer?.firstName} lastName={swimmer?.lastName} size="xl" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-headline-md text-on-surface">{fullName}</h2>
                  <Badge tone={enrolled ? 'success' : 'warning'} size="sm">
                    {enrolled ? 'Enrolled' : 'Not enrolled'}
                  </Badge>
                </div>
                <p className="mt-0.5 text-body-sm text-on-surface-variant">
                  {age != null ? `Age ${age}` : 'Age not set'}
                  {swimmer?.dateOfBirth ? ` · Born ${formatDateOfBirth(swimmer.dateOfBirth)}` : ''}
                </p>
              </div>
            </div>
            {!enrolled ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0 rounded-full"
                onClick={() => onNavigate(parentEnrollPath({ childId, from: parentSwimmerPath(childId) }))}
              >
                Join class
              </Button>
            ) : null}
          </div>
        </section>

        <div className="mt-3 flex gap-2 overflow-x-auto py-1" role="tablist">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-2 text-label-md',
                tab === item.id
                  ? 'bg-primary text-on-primary shadow-[0_4px_14px_rgba(0,100,124,0.25)]'
                  : 'bg-surface-container-lowest text-on-surface-variant shadow-[0_2px_8px_rgba(0,100,124,0.06)]',
              )}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error ? (
          <p role="alert" className="mt-3 rounded-2xl bg-error-container px-3 py-2 text-body-sm text-on-error-container">
            {error}
          </p>
        ) : null}

        {loading ? <p className="py-8 text-body-md text-on-surface-variant">Loading swimmer…</p> : null}

        {!loading && tab === 'activity' ? (
          <section className="mt-3 flex flex-col gap-3" aria-label="Activity and photos">
            <div className="flex gap-2 overflow-x-auto py-1">
              {(
                [
                  { id: 'all' as const, label: 'All', count: counts.all },
                  { id: 'photos' as const, label: 'Photos', count: counts.photos },
                  { id: 'notes' as const, label: 'Notes', count: counts.notes },
                ]
              ).map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1.5 text-label-md',
                    filter === pill.id ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container-low text-on-surface-variant',
                  )}
                  onClick={() => setFilter(pill.id)}
                >
                  {pill.label} {pill.count}
                </button>
              ))}
            </div>
            {filteredLogs.length === 0 ? (
              <p className="rounded-3xl border border-dashed border-outline-variant/50 px-4 py-8 text-center text-body-sm text-on-surface-variant">
                {logs.length === 0
                  ? 'No updates yet. Your instructor will post notes and photos from the deck.'
                  : 'Nothing matches this filter.'}
              </p>
            ) : (
              <ul className="flex flex-col gap-3 pb-8">
                {filteredLogs.map((log) => {
                  const when = formatProgressLogWhen(log.createdAt)
                  const sessionLabel = new Date(log.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })
                  const place = classes.find((row) => row.classId === log.classId)
                  const placeLabel = [place?.location?.trim(), place?.className?.trim()].filter(Boolean).join(' · ')
                  const cheer = cheers.get(log.id) ?? { count: 0, cheeredByMe: false }
                  return (
                    <li key={log.id}>
                      <article className="flex flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-[0_4px_16px_-2px_rgba(0,100,124,0.08)]">
                        {log.photoUrl ? (
                          <button
                            type="button"
                            className="relative block w-full bg-surface-container-high"
                            onClick={() => setLightboxUrl(log.photoUrl)}
                          >
                            <WavyImageFrame src={log.photoUrl} alt="Progress photo" />
                            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-surface-container-lowest/90 px-2.5 py-1 text-label-sm font-semibold text-on-surface shadow-sm backdrop-blur-md">
                              <MaterialIcon name="stars" size={16} className="text-secondary" filled />
                              Deck photo
                            </span>
                            <span className="absolute bottom-3 right-3 rounded-full bg-on-background/70 px-2.5 py-1 text-label-sm font-medium text-surface-container-lowest backdrop-blur-md">
                              {sessionLabel}
                            </span>
                          </button>
                        ) : null}
                        <div className="flex flex-col gap-2 p-4">
                          <p className="text-label-sm uppercase tracking-wide text-outline">
                            {log.instructorName}
                            {' · '}
                            {placeLabel || `${when.dateLine} · ${when.timeLine}`}
                          </p>
                          {(() => {
                            const note = splitProgressNote(log.note)
                            const title = note.title || (log.photoUrl ? 'Progress photo' : 'Deck update')
                            return (
                              <>
                                <h3 className="text-headline-sm text-on-surface">{title}</h3>
                                {note.body ? (
                                  <p className="text-body-md leading-relaxed text-on-surface-variant">{note.body}</p>
                                ) : null}
                              </>
                            )
                          })()}
                          <button
                            type="button"
                            disabled={!parentId || cheerBusyId === log.id}
                            className={cn(
                              'inline-flex h-10 items-center justify-center gap-1.5 self-start rounded-full px-3.5 text-label-md font-semibold disabled:opacity-60',
                              cheer.cheeredByMe
                                ? 'bg-secondary-container text-on-secondary-container'
                                : 'bg-surface-container-high text-primary',
                            )}
                            onClick={() => void toggleCheer(log.id)}
                          >
                            <MaterialIcon name="celebration" size={16} filled={cheer.cheeredByMe} />
                            {cheer.cheeredByMe
                              ? cheer.count === 1
                                ? 'Cheered'
                                : `Cheered · ${cheer.count}`
                              : cheer.count > 0
                                ? `Cheer · ${cheer.count}`
                                : 'Cheer'}
                          </button>
                        </div>
                      </article>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        ) : null}

        {!loading && tab === 'classes' ? (
          <section className="mt-3 flex flex-col gap-3 pb-8" aria-label="Classes and schedule">
            {classes.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-outline-variant/50 px-4 py-8 text-center">
                <p className="text-body-sm text-on-surface-variant">Not enrolled in a class yet.</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-full"
                  onClick={() => onNavigate(parentEnrollPath({ childId, from: parentSwimmerPath(childId) }))}
                >
                  Join a class
                </Button>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {classes.map((enrollment) => {
                  const season = formatSeasonRangeLabel(enrollment.seasonStart, enrollment.seasonEnd)
                  const classId = enrollment.classId
                  return (
                    <li
                      key={classId}
                      className="flex flex-col gap-2 rounded-3xl bg-surface-container-lowest p-card-padding shadow-[0_4px_16px_-2px_rgba(0,100,124,0.08)]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        {classId ? (
                          <button
                            type="button"
                            className="truncate text-left text-headline-sm text-on-surface"
                            onClick={() =>
                              onNavigate(
                                parentSwimmerClassPath(childId, classId, {
                                  from: parentSwimmerPath(childId),
                                }),
                              )
                            }
                          >
                            {enrollment.className ?? 'Class'}
                          </button>
                        ) : (
                          <p className="truncate text-headline-sm text-on-surface">{enrollment.className ?? 'Class'}</p>
                        )}
                        {enrollment.status === 'pending' ? <Badge tone="warning" size="sm">Pending</Badge> : null}
                      </div>
                      <p className="text-body-sm text-on-surface-variant">Coach {enrollment.instructorName?.trim() || 'not set'}</p>
                      <p className="text-body-sm text-on-surface-variant">{enrollment.scheduleDetails?.trim() || 'Schedule not set'}</p>
                      <p className="text-body-sm text-on-surface-variant">{enrollment.location?.trim() || 'Location not set'}</p>
                      {season ? <p className="text-body-sm text-on-surface-variant">{season}</p> : null}
                      {classId ? (
                        <div className="flex flex-col gap-2">
                          {(classForms.get(formComplianceKey(childId, classId)) ?? []).length === 0 ? (
                            <p className="text-body-sm text-on-surface-variant">No liability forms assigned.</p>
                          ) : (
                            (classForms.get(formComplianceKey(childId, classId)) ?? []).map((form) => (
                              <div key={form.templateId} className="flex flex-wrap items-center gap-2">
                                <FormComplianceBadge
                                  status={form.signed ? 'signed' : 'pending'}
                                  swimmerName={fullName}
                                  label={form.title}
                                  onOpen={
                                    !form.signed
                                      ? () => onNavigate(parentQuestionnairePath(childId, classId, form.templateId))
                                      : undefined
                                  }
                                />
                                {form.isMandatoryForEnrollment && !form.signed ? (
                                  <Badge tone="warning" size="sm">Required</Badge>
                                ) : null}
                              </div>
                            ))
                          )}
                        </div>
                      ) : null}
                      {classId && confirmLeaveId === classId ? (
                        <div className="mt-1 flex flex-col gap-2 rounded-2xl bg-error-container/60 px-3 py-3">
                          <p className="text-body-sm text-on-error-container">Leave {enrollment.className ?? 'this class'}?</p>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              className="h-10 flex-1 rounded-full"
                              disabled={leavingClassId === classId}
                              onClick={() => void confirmLeave(classId)}
                            >
                              {leavingClassId === classId ? 'Leaving…' : 'Leave class'}
                            </Button>
                            <Button type="button" variant="ghost" className="h-10" onClick={() => setConfirmLeaveId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : classId ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="mt-1 h-10 rounded-full"
                          onClick={() => setConfirmLeaveId(classId)}
                        >
                          Leave class
                        </Button>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
            <Button
              type="button"
              fullWidth
              className="h-11 rounded-full"
              onClick={() => onNavigate(parentEnrollPath({ childId, from: parentSwimmerPath(childId) }))}
            >
              <MaterialIcon name="add" size={18} />
              Add another class
            </Button>
          </section>
        ) : null}

        {!loading && tab === 'waivers' ? (
          <section className="mt-3 flex flex-col gap-3 pb-8" aria-label="Waivers and compliance">
            {waivers.length === 0 ? (
              <p className="rounded-3xl border border-dashed border-outline-variant/50 px-4 py-8 text-center text-body-sm text-on-surface-variant">
                No signed waivers yet. Seasonal forms show up here after you sign them.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {waivers.map((form) => (
                  <li key={form.id} className="rounded-3xl bg-surface-container-lowest px-4 py-3 shadow-[0_4px_16px_-2px_rgba(0,100,124,0.08)]">
                    <p className="text-label-lg text-on-surface">{form.title}</p>
                    <p className="text-body-sm text-on-surface-variant">
                      {[form.className, signedLabel(form.signedAt)].filter(Boolean).join(' · ')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              aria-expanded={dailyOpen}
              className="flex items-center justify-between rounded-3xl bg-surface-container-low px-4 py-3 text-left"
              onClick={() => setDailyOpen((open) => !open)}
            >
              <span>
                <span className="block text-label-lg text-on-surface">Daily BUDS logs</span>
                <span className="text-body-sm text-on-surface-variant">
                  {dailyLogs.length === 0 ? 'No daily check-ins yet' : `${dailyLogs.length} signed`}
                </span>
              </span>
              <MaterialIcon name={dailyOpen ? 'expand_less' : 'expand_more'} size={20} />
            </button>
            {dailyOpen ? (
              dailyLogs.length === 0 ? (
                <p className="px-1 text-body-sm text-on-surface-variant">Past daily check-ins will be listed here.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {dailyLogs.map((form) => (
                    <li key={form.id} className="rounded-2xl bg-surface-container-lowest px-3 py-2">
                      <p className="text-label-md text-on-surface">{form.title}</p>
                      <p className="text-body-sm text-on-surface-variant">
                        {[form.className, signedLabel(form.signedAt)].filter(Boolean).join(' · ')}
                      </p>
                    </li>
                  ))}
                </ul>
              )
            ) : null}
          </section>
        ) : null}
      </main>

      {lightboxUrl ? (
        <div className="fixed inset-0 z-[60] flex flex-col bg-inverse-surface/90 p-4" role="dialog" aria-label="Progress photo">
          <div className="flex justify-end pt-safe">
            <button
              type="button"
              aria-label="Close photo"
              className="flex size-10 items-center justify-center rounded-full bg-on-surface/20 text-surface-bright"
              onClick={() => setLightboxUrl(null)}
            >
              <MaterialIcon name="close" size={24} />
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <img src={lightboxUrl} alt="Enlarged progress photo" className="max-h-[70vh] max-w-full rounded-2xl object-contain" />
          </div>
        </div>
      ) : null}
    </div>
  )
}
