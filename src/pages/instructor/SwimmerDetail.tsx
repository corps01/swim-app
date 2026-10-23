import { useCallback, useEffect, useMemo, useState } from 'react'
import { deleteProgressLog } from '../../lib/api/progressLogs'
import { fetchInstructorStudent, type InstructorStudentRecord } from '../../lib/api/instructorStudent'
import { ageFromDateOfBirth, formatDateOfBirth } from '../../lib/swimmers'
import { formatProgressLogWhen, splitProgressNote } from '../../lib/progressLogDisplay'
import { formatDateOnlyForDisplay } from '../../lib/dateOnly'
import { formatAppError } from '../../lib/errors'
import { getDeckClearanceState } from '../../utils/healthClearance'
import {
  INSTRUCTOR_ACCOUNT_PATH,
  INSTRUCTOR_SWIMMERS_PATH,
  instructorBackTarget,
  instructorClassDetailPath,
  instructorProgressLogPath,
  instructorSubmissionPath,
  instructorSwimmerPath,
  parseInstructorStudentTab,
  type InstructorStudentTab,
} from '../../lib/appNavigation'
import { useAppPath } from '../../hooks/useAppPath'
import { useAuth } from '../../hooks/useAuth'
import { WavyImageFrame } from '../../components/common/WavyImageFrame'
import { Badge, MaterialIcon, ProfileAvatar } from '../../components/ui'
import { cn } from '../../lib/cn'

interface InstructorSwimmerDetailProps {
  childId: string
  onNavigate: (path: string) => void
}

export function InstructorSwimmerDetail({ childId, onNavigate }: InstructorSwimmerDetailProps) {
  const { search, replace, goBack } = useAppPath()
  const { user } = useAuth()
  const tab = parseInstructorStudentTab(search)
  const backTarget = useMemo(
    () => instructorBackTarget(search, INSTRUCTOR_SWIMMERS_PATH),
    [search],
  )

  const [record, setRecord] = useState<InstructorStudentRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'photos' | 'notes'>('all')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRecord(await fetchInstructorStudent(childId))
    } catch (err) {
      setError(formatAppError(err))
      setRecord(null)
    } finally {
      setLoading(false)
    }
  }, [childId])

  useEffect(() => {
    void load()
  }, [load])

  function selectTab(next: InstructorStudentTab) {
    const from = new URLSearchParams(search).get('from')?.trim()
    replace(instructorSwimmerPath(childId, { tab: next, from: from || undefined }))
  }

  async function removeLog(logId: string) {
    setDeletingId(logId)
    setError(null)
    try {
      await deleteProgressLog(logId)
      setConfirmDeleteId(null)
      await load()
    } catch (err) {
      setError(formatAppError(err))
    } finally {
      setDeletingId(null)
    }
  }

  const profile = record?.profile ?? null
  const fullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : 'Swimmer'
  const age = profile?.dateOfBirth ? ageFromDateOfBirth(profile.dateOfBirth) : null
  const phone = profile?.parentPhone?.replace(/\s/g, '') || null
  const logs = record?.logs ?? []
  const counts = {
    all: logs.length,
    photos: logs.filter((row) => row.photoUrl).length,
    notes: logs.filter((row) => row.note?.trim()).length,
  }
  const visibleLogs = logs.filter((row) => {
    if (filter === 'photos') return Boolean(row.photoUrl)
    if (filter === 'notes') return Boolean(row.note?.trim())
    return true
  })
  const clearance = profile
    ? getDeckClearanceState(
        { formPending: record?.todayFitness?.status === 'MISSING' },
        record?.todayFitness ?? null,
      )
    : null
  const signedWaivers = (record?.waivers ?? []).filter((row) => row.signed).length
  const classId = profile?.classes[0]?.classId ?? null

  const tabs: { id: InstructorStudentTab; label: string; icon: string }[] = [
    { id: 'activity', label: 'Activity', icon: 'photo_library' },
    { id: 'health', label: 'BUDS & health', icon: 'health_and_safety' },
    { id: 'waivers', label: 'Waivers', icon: 'description' },
  ]

  return (
    <div className="flex min-h-svh flex-col bg-surface text-on-surface">
      <header className="fixed inset-x-0 top-0 z-50 bg-surface/90 pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-2 px-margin-screen">
          <button
            type="button"
            aria-label="Back to swimmers"
            className="flex h-11 shrink-0 items-center gap-1 rounded-full px-2 text-primary active:scale-95"
            onClick={() => goBack(backTarget)}
          >
            <MaterialIcon name="arrow_back" size={22} />
            <span className="text-label-md">Swimmers</span>
          </button>
          <h1 className="min-w-0 flex-1 truncate text-headline-sm">Swimmer</h1>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-margin-screen pb-safe pt-[calc(4rem+env(safe-area-inset-top))]">
        <div className="flex items-center justify-end py-3">
          <button
            type="button"
            className="inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-label-md font-bold text-on-primary active:scale-95"
            onClick={() =>
              onNavigate(
                instructorProgressLogPath({
                  childId,
                  classId,
                  from: 'student',
                }),
              )
            }
          >
            <MaterialIcon name="add" size={18} />
            Log progress
          </button>
        </div>

        {error ? <p className="mb-3 text-body-md text-error">{error}</p> : null}
        {loading ? <p className="py-6 text-body-md text-on-surface-variant">Loading swimmer…</p> : null}
        {!loading && !profile ? (
          <p className="py-6 text-body-md text-on-surface-variant">This swimmer is not on your roster.</p>
        ) : null}

        {profile ? (
          <>
            <section className="rounded-2xl bg-surface-container-lowest p-card-padding shadow-[0_4px_16px_-2px_rgba(8,145,178,0.08)]">
              <div className="flex items-start gap-3">
                <ProfileAvatar firstName={profile.firstName} lastName={profile.lastName} size="xl" />
                <div className="min-w-0">
                  <h2 className="truncate text-headline-lg-mobile text-on-surface">{fullName}</h2>
                  <p className="text-body-sm text-on-surface-variant">
                    {age != null ? `${age} years old` : 'Age unknown'}
                    {profile.dateOfBirth ? ` · ${formatDateOfBirth(profile.dateOfBirth)}` : ''}
                  </p>
                </div>
              </div>

              {profile.classes.length > 0 ? (
                <ul className="mt-3 flex flex-col gap-2">
                  {profile.classes.map((swimClass) => (
                    <li key={swimClass.classId} className="rounded-xl bg-surface-container px-3 py-2">
                      <button
                        type="button"
                        onClick={() =>
                          onNavigate(instructorClassDetailPath(swimClass.classId, { from: 'swimmers' }))
                        }
                        className="text-left text-label-md font-bold text-primary"
                      >
                        {swimClass.name}
                      </button>
                      <p className="text-body-sm text-on-surface-variant">Coach {swimClass.coachName}</p>
                      <p className="text-body-sm text-on-surface-variant">
                        {swimClass.schedule?.trim() || 'Schedule not set'}
                        {swimClass.location?.trim() ? ` · ${swimClass.location}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-body-sm text-on-surface-variant">No active class on your roster.</p>
              )}

              <div className="mt-3 flex flex-col gap-3 rounded-md bg-surface-container-low p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-label-sm uppercase tracking-wide text-outline">Parent contact</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-label-md text-on-surface">
                    <MaterialIcon name="family_restroom" size={18} className="text-primary" />
                    {profile.parentName}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {phone ? (
                    <a
                      href={`tel:${phone}`}
                      className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-secondary-container px-3 text-label-md font-bold text-on-secondary-container"
                    >
                      <MaterialIcon name="call" size={18} />
                      {profile.parentPhone}
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onNavigate(`${INSTRUCTOR_ACCOUNT_PATH}?edit=phone`)}
                      className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-surface-container px-3 text-label-md font-bold text-primary"
                    >
                      <MaterialIcon name="call" size={18} />
                      Add phone
                    </button>
                  )}
                  {phone ? (
                    <a
                      href={`sms:${phone}`}
                      className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-primary-fixed px-3 text-label-md font-bold text-on-primary-fixed-variant"
                    >
                      <MaterialIcon name="chat" size={18} />
                      Text
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onNavigate(`${INSTRUCTOR_ACCOUNT_PATH}?edit=phone`)}
                      className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-surface-container px-3 text-label-md font-bold text-primary"
                    >
                      <MaterialIcon name="chat" size={18} />
                      Add phone
                    </button>
                  )}
                </div>
              </div>
            </section>

            <nav className="mt-4 flex gap-1 rounded-xl bg-surface-container p-1" aria-label="Swimmer sections">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-selected={tab === item.id}
                  onClick={() => selectTab(item.id)}
                  className={cn(
                    'flex h-11 flex-1 items-center justify-center gap-1 rounded-lg text-label-sm font-bold',
                    tab === item.id ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant',
                  )}
                >
                  <MaterialIcon name={item.icon} size={16} />
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </nav>

            {tab === 'activity' ? (
              <section className="mt-4 flex flex-col gap-3">
                <div className="flex gap-2 overflow-x-auto">
                  {(
                    [
                      ['all', `All (${counts.all})`],
                      ['photos', `Photos (${counts.photos})`],
                      ['notes', `Notes (${counts.notes})`],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFilter(id)}
                      className={cn(
                        'h-9 shrink-0 rounded-full px-3.5 text-label-sm font-bold',
                        filter === id ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {visibleLogs.length === 0 ? (
                  <p className="text-body-md text-on-surface-variant">No progress logged yet.</p>
                ) : (
                  visibleLogs.map((log) => {
                    const when = formatProgressLogWhen(log.createdAt)
                    const cheers = record?.cheerCounts.get(log.id) ?? 0
                    const mine = user?.id === log.instructorId
                    return (
                      <article
                        key={log.id}
                        className="flex flex-col gap-2 rounded-2xl bg-surface-container-lowest p-card-padding shadow-[0_4px_16px_-2px_rgba(8,145,178,0.08)]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-label-sm uppercase tracking-wide text-outline">
                            {log.instructorName} · {when.dateLine} · {when.timeLine}
                          </p>
                          {mine ? <Badge tone="primary">Your log</Badge> : null}
                        </div>
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
                        {log.photoUrl ? <WavyImageFrame src={log.photoUrl} alt="Progress photo" /> : null}
                        <div className="flex items-center justify-between gap-2">
                          <p className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant">
                            <MaterialIcon name="favorite" size={16} className="text-tertiary" />
                            {cheers} {cheers === 1 ? 'cheer' : 'cheers'}
                          </p>
                          {mine ? (
                            confirmDeleteId === log.id ? (
                              <button
                                type="button"
                                disabled={deletingId === log.id}
                                onClick={() => void removeLog(log.id)}
                                className="text-label-md font-bold text-error"
                              >
                                {deletingId === log.id ? 'Removing…' : 'Remove this log'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(log.id)}
                                className="text-label-md font-semibold text-on-surface-variant"
                              >
                                Remove
                              </button>
                            )
                          ) : null}
                        </div>
                      </article>
                    )
                  })
                )}
              </section>
            ) : null}

            {tab === 'health' && clearance ? (
              <section className="mt-4 flex flex-col gap-3">
                <div className={cn('flex flex-col gap-1.5 rounded-md px-3 py-3', clearance.color)}>
                  <div className="flex items-center gap-1.5">
                    <MaterialIcon name={clearance.icon} size={22} className={clearance.accent} />
                    <p className={cn('text-label-lg font-black uppercase tracking-wider', clearance.accent)}>
                      {clearance.label}
                    </p>
                  </div>
                  <p className="text-body-sm leading-tight">{clearance.detail}</p>
                </div>
                {(record?.healthDays.length ?? 0) === 0 ? (
                  <p className="text-body-md text-on-surface-variant">No BUDS history yet.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {record?.healthDays.map((day) => (
                      <li key={day.date} className="rounded-xl bg-surface-container-lowest p-3 shadow-sm">
                        <p className="text-label-md font-bold text-on-surface">{formatDateOnlyForDisplay(day.date)}</p>
                        <p className="mt-1 text-body-sm text-on-surface-variant">
                          {day.sleepHours != null ? `${day.sleepHours} hrs sleep` : 'Sleep not reported'}
                          {day.mealLabel ? ` · Meal ${day.mealLabel}` : ''}
                          {day.illness ? ` · ${day.illness}` : ' · No illness flags'}
                        </p>
                        {day.overrideName ? (
                          <p className="mt-1 text-body-sm text-amber-900">
                            Verbal clearance by {day.overrideName}
                            {day.overrideReason ? ` · ${day.overrideReason}` : ''}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}

            {tab === 'waivers' ? (
              <section className="mt-4 flex flex-col gap-3">
                <p className="text-label-md text-on-surface-variant">
                  {signedWaivers} of {record?.waivers.length ?? 0} signed
                </p>
                {(record?.waivers.length ?? 0) === 0 ? (
                  <p className="text-body-md text-on-surface-variant">No seasonal forms are assigned.</p>
                ) : (
                  record?.waivers.map((waiver) => (
                    <article
                      key={waiver.key}
                      className="flex flex-col gap-2 rounded-2xl bg-surface-container-lowest p-card-padding shadow-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <h3 className="text-label-lg font-bold text-on-surface">{waiver.title}</h3>
                        <p className="text-body-sm text-on-surface-variant">
                          {waiver.className ? `${waiver.className} · ` : ''}
                          {waiver.signed && waiver.signedAt
                            ? `Signed ${formatDateOnlyForDisplay(waiver.signedAt.slice(0, 10))}`
                            : 'Not signed yet'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={waiver.signed ? 'success' : 'warning'}>{waiver.signed ? 'Signed' : 'Pending'}</Badge>
                        {waiver.submissionId ? (
                          <button
                            type="button"
                            className="inline-flex h-10 items-center gap-1 rounded-xl bg-surface-container px-3 text-label-md font-bold text-primary"
                            onClick={() =>
                              onNavigate(instructorSubmissionPath(waiver.submissionId!, { from: 'student', childId }))
                            }
                          >
                            View
                            <MaterialIcon name="open_in_new" size={16} />
                          </button>
                        ) : null}
                      </div>
                    </article>
                  ))
                )}
              </section>
            ) : null}
          </>
        ) : null}
      </main>
    </div>
  )
}
