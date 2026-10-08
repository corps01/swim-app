import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchProgressLogsForChild, type ProgressLog } from '../../lib/api/progressLogs'
import {
  fetchCheersForLogs,
  setProgressCheer,
  type ProgressCheerState,
} from '../../lib/api/progressCheers'
import { fetchParentSwimmers } from '../../lib/api/swimmers'
import { ageFromDateOfBirth, swimmerHasActiveClass, type SwimmerRosterEntry } from '../../lib/swimmers'
import { formatLatestActivitySnippet, formatProgressLogWhen } from '../../lib/progressLogDisplay'
import { formatAppError } from '../../lib/errors'
import { PARENT_HOME_PATH } from '../../lib/appNavigation'
import { useAppPath } from '../../hooks/useAppPath'
import { useAuth } from '../../hooks/useAuth'
import { MaterialIcon } from '../../components/ui'
import { cn } from '../../lib/cn'

type ActivityFilter = 'all' | 'photos' | 'notes'

interface ParentSwimmerActivityPageProps {
  childId: string
}

function swimmerInitials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

function primaryEnrollment(swimmer: SwimmerRosterEntry) {
  return swimmer.enrollments.find((row) => row.status === 'active' && row.classId) ?? swimmer.enrollments[0]
}

export function ParentSwimmerActivityPage({ childId }: ParentSwimmerActivityPageProps) {
  const { goBack } = useAppPath()
  const { user } = useAuth()
  const parentId = user?.id

  const [swimmer, setSwimmer] = useState<SwimmerRosterEntry | null>(null)
  const [logs, setLogs] = useState<ProgressLog[]>([])
  const [cheers, setCheers] = useState<Map<string, ProgressCheerState>>(new Map())
  const [cheerBusyId, setCheerBusyId] = useState<string | null>(null)
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
      setSwimmer(swimmers.find((row) => row.id === childId) ?? null)
      const rows = await fetchProgressLogsForChild(childId)
      setLogs(rows)
      setCheers(await fetchCheersForLogs(rows.map((row) => row.id), parentId))
    } catch (err) {
      setError(formatAppError(err))
      setLogs([])
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

  const latestLog = logs[0] ?? null
  const enrollment = swimmer ? primaryEnrollment(swimmer) : null
  const age = swimmer ? ageFromDateOfBirth(swimmer.dateOfBirth) : null
  const fullName = swimmer ? `${swimmer.firstName} ${swimmer.lastName}` : 'Swimmer'

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

  const filterPills: { id: ActivityFilter; label: string; count: number; icon?: string }[] = [
    { id: 'all', label: 'All updates', count: counts.all },
    { id: 'photos', label: 'Milestone photos', count: counts.photos, icon: 'photo_camera' },
    { id: 'notes', label: 'Coach notes', count: counts.notes, icon: 'sticky_note_2' },
  ]

  return (
    <div className="flex min-h-svh flex-col bg-surface text-on-surface">
      <header className="fixed inset-x-0 top-0 z-50 bg-surface/85 pt-safe shadow-[0_4px_16px_-2px_rgba(8,145,178,0.06)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-between gap-3 px-margin-screen">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              aria-label="Back to home"
              className="flex size-11 shrink-0 items-center justify-center rounded-full transition-all hover:bg-surface-container active:scale-95"
              onClick={() => goBack(PARENT_HOME_PATH)}
            >
              <MaterialIcon name="arrow_back" size={24} />
            </button>
            <h1 className="truncate text-headline-sm">Swimmer activity stream</h1>
          </div>
          <div className="flex size-8 items-center justify-center rounded-full bg-primary text-on-primary">
            <MaterialIcon name="person" size={18} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-margin-screen pb-safe pt-[calc(4rem+env(safe-area-inset-top))]">
        <div className="relative pt-3 pb-2">
          <div className="relative overflow-hidden rounded-2xl bg-surface-container-lowest p-card-padding shadow-[0_4px_16px_-2px_rgba(8,145,178,0.08)]">
            <div className="pointer-events-none absolute -right-8 -top-8 size-36 rounded-full bg-primary-fixed/30 blur-2xl" />
            <div className="relative z-10 flex items-start gap-3.5">
              <div className="relative shrink-0">
                <div className="flex size-16 items-center justify-center overflow-hidden rounded-full bg-primary-fixed text-xl font-bold text-on-primary-fixed-variant shadow-inner">
                  {swimmer
                    ? swimmerInitials(swimmer.firstName, swimmer.lastName)
                    : '—'}
                </div>
                {swimmer && swimmerHasActiveClass(swimmer) ? (
                  <div
                    className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-secondary text-on-secondary shadow-sm"
                    title="Enrolled"
                  >
                    <MaterialIcon name="water_drop" size={15} filled />
                  </div>
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="truncate text-headline-md">{fullName}</h2>
                  {swimmer && swimmerHasActiveClass(swimmer) ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-secondary-container px-2.5 py-0.5 text-label-sm font-semibold text-on-secondary-container">
                      <MaterialIcon name="verified" size={13} filled />
                      Active
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-body-md text-on-surface-variant">
                  {age != null ? `Age ${age}` : 'Age —'}
                  {enrollment?.className ? (
                    <>
                      {' '}
                      • <span className="font-semibold text-primary">{enrollment.className}</span>
                    </>
                  ) : null}
                </p>
                {enrollment?.instructorName ? (
                  <p className="mt-1.5 flex items-center gap-1.5 truncate text-body-sm text-on-surface-variant">
                    <MaterialIcon name="sports" size={16} className="text-primary" />
                    Coach {enrollment.instructorName}
                    {enrollment.scheduleDetails ? ` • ${enrollment.scheduleDetails}` : ''}
                  </p>
                ) : null}
              </div>
            </div>

            {latestLog ? (
              <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-surface-container-low p-3">
                <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container shadow-sm">
                  <MaterialIcon name="star" size={16} filled />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-label-sm font-bold uppercase tracking-wider text-primary">
                      Latest splash milestone
                    </span>
                    <span className="text-body-sm text-outline">
                      • {formatProgressLogWhen(latestLog.createdAt).dateLine}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-body-sm font-semibold text-on-surface">
                    {formatLatestActivitySnippet(latestLog)}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="-mx-margin-screen mt-3 flex gap-2 overflow-x-auto px-margin-screen py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filterPills.map((pill) => {
              const active = filter === pill.id
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setFilter(pill.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-label-md shadow-sm transition-all active:scale-95',
                    active
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container',
                  )}
                >
                  {pill.icon ? <MaterialIcon name={pill.icon} size={16} className="text-primary" /> : null}
                  <span>{pill.label}</span>
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-label-sm',
                      active ? 'bg-on-primary/20' : 'text-outline',
                    )}
                  >
                    {pill.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {error ? <p className="text-body-md text-error">{error}</p> : null}

        {loading ? (
          <p className="py-8 text-body-md text-on-surface-variant">Loading activity…</p>
        ) : filteredLogs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-outline-variant/50 bg-surface-container-lowest p-8 text-center">
            <MaterialIcon name="timeline" size={32} className="mx-auto mb-3 text-primary" />
            <p className="text-body-md text-on-surface-variant">
              {logs.length === 0
                ? 'No updates yet. Your instructor will post notes and photos from the pool deck.'
                : 'No updates match this filter.'}
            </p>
          </div>
        ) : (
          <div className="relative space-y-4 pb-8">
            <div
              className="pointer-events-none absolute bottom-6 left-[31px] top-6 w-0.5 bg-surface-container-highest"
              aria-hidden
            />
            <ul className="flex flex-col gap-4">
              {filteredLogs.map((log) => {
                const { dateLine, timeLine } = formatProgressLogWhen(log.createdAt)
                const cheer = cheers.get(log.id) ?? { count: 0, cheeredByMe: false }
                return (
                  <li key={log.id} className="relative z-10">
                    <article className="rounded-2xl bg-surface-container-lowest p-card-padding shadow-[0_4px_16px_-2px_rgba(8,145,178,0.08)]">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-10 items-center justify-center rounded-full bg-surface-container text-label-md font-bold text-primary shadow-sm">
                            {log.instructorName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-label-lg font-bold text-on-surface">{log.instructorName}</p>
                            <p className="text-body-sm text-on-surface-variant">
                              <span className="font-semibold text-primary">{dateLine}</span>
                              {' · '}
                              {timeLine}
                            </p>
                          </div>
                        </div>
                      </div>
                      {log.note ? (
                        <p className="text-body-lg leading-relaxed text-on-surface">{log.note}</p>
                      ) : null}
                      {log.photoUrl ? (
                        <button
                          type="button"
                          className="group relative mt-3 block w-full overflow-hidden rounded-2xl text-left shadow-sm"
                          onClick={() => setLightboxUrl(log.photoUrl)}
                        >
                          <img
                            src={log.photoUrl}
                            alt="Progress photo"
                            className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                          />
                          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-on-surface/60 to-transparent p-3">
                            <span className="flex items-center gap-1 rounded-full bg-inverse-surface/40 px-2 py-1 text-label-sm text-surface-bright backdrop-blur-md">
                              <MaterialIcon name="fullscreen" size={14} />
                              Tap to view full photo
                            </span>
                          </div>
                        </button>
                      ) : null}
                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-outline-variant/20 pt-3">
                        <p className="text-body-sm text-on-surface-variant">
                          {cheer.count === 0
                            ? 'No cheers yet'
                            : cheer.count === 1
                              ? '1 cheer'
                              : `${cheer.count} cheers`}
                        </p>
                        <button
                          type="button"
                          disabled={!parentId || cheerBusyId === log.id}
                          onClick={() => void toggleCheer(log.id)}
                          className={cn(
                            'inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-label-md font-semibold transition-transform active:scale-95 disabled:opacity-60',
                            cheer.cheeredByMe
                              ? 'bg-tertiary-container text-on-tertiary-container'
                              : 'bg-primary-container text-on-primary-container',
                          )}
                        >
                          <MaterialIcon name="celebration" size={16} filled={cheer.cheeredByMe} />
                          {cheer.cheeredByMe ? 'Cheered' : 'Cheer'}
                        </button>
                      </div>
                    </article>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </main>

      {lightboxUrl ? (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-inverse-surface/90 p-4 backdrop-blur-md"
          role="dialog"
          aria-label="Progress photo"
        >
          <div className="flex items-center justify-between pt-safe text-surface-bright">
            <span className="text-label-lg">Milestone moment</span>
            <button
              type="button"
              aria-label="Close photo"
              className="flex size-10 items-center justify-center rounded-full bg-on-surface/20"
              onClick={() => setLightboxUrl(null)}
            >
              <MaterialIcon name="close" size={24} />
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center py-4">
            <img src={lightboxUrl} alt="Enlarged progress photo" className="max-h-[70vh] max-w-full rounded-2xl object-contain" />
          </div>
        </div>
      ) : null}
    </div>
  )
}
