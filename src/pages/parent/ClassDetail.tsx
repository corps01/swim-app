import { useEffect, useMemo, useState } from 'react'
import { wavePhaseFor } from '../../components/graphics/DriftWaves'
import { ClassContextBanner, ClassDetailRows } from '../../components/home/ClassContextBanner'
import { AppLayout } from '../../components/layout'
import { Badge, Button, MaterialIcon, ProfileAvatar } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'
import { useParentSwimmers } from '../../hooks/useParentSwimmers'
import { fetchParentClassForms, formComplianceKey } from '../../lib/api/forms'
import { leaveClassEnrollment } from '../../lib/api/parentEnrollment'
import { getSupabaseClient } from '../../lib/supabase'
import { PARENT_CLASSES_PATH, parentWaiverPath } from '../../lib/appNavigation'
import { accentForClass } from '../../lib/classAccent'
import { formatSeasonRangeLabel } from '../../lib/classSchedule'
import { formatAppError } from '../../lib/errors'
import type { SwimmerClassEnrollment, SwimmerRosterEntry } from '../../lib/swimmers'
import type { ParentClassForm } from '../../types/questionnaire'
import { cn } from '../../lib/cn'

interface ClassDetailProps {
  classId: string
  onBack: () => void
  onNavigate: (path: string) => void
}

function seasonProgress(start: string | null, end: string | null): { percent: number; label: string } | null {
  if (!start || !end) return null
  const from = new Date(`${start.slice(0, 10)}T00:00:00`)
  const to = new Date(`${end.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) return null
  const now = Date.now()
  const percent = Math.min(100, Math.max(0, Math.round(((now - from.getTime()) / (to.getTime() - from.getTime())) * 100)))
  const weeksLeft = Math.max(0, Math.ceil((to.getTime() - now) / (7 * 24 * 60 * 60 * 1000)))
  return { percent, label: weeksLeft === 1 ? '1 week left' : `${weeksLeft} weeks left` }
}

export function ClassDetail({ classId, onBack, onNavigate }: ClassDetailProps) {
  const { user } = useAuth()
  const { swimmers, loading, error, refresh } = useParentSwimmers(user?.id)
  const [forms, setForms] = useState<Array<ParentClassForm & { unsignedChildId: string | null }>>([])
  const [classCode, setClassCode] = useState<string | null>(null)
  const [signedAtByTemplate, setSignedAtByTemplate] = useState<Map<string, string>>(new Map())
  const [confirmLeaveId, setConfirmLeaveId] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const match = useMemo(() => {
    const kids: SwimmerRosterEntry[] = []
    let enrollment: SwimmerClassEnrollment | null = null
    for (const swimmer of swimmers) {
      const row = swimmer.enrollments.find((item) => item.classId === classId && item.status !== 'inactive')
      if (!row) continue
      kids.push(swimmer)
      enrollment ??= row
    }
    return { enrollment, kids }
  }, [classId, swimmers])

  const season = match.enrollment
    ? formatSeasonRangeLabel(match.enrollment.seasonStart, match.enrollment.seasonEnd)
    : null
  const progress = match.enrollment
    ? seasonProgress(match.enrollment.seasonStart, match.enrollment.seasonEnd)
    : null
  const signedCount = forms.filter((form) => form.signed).length

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2400)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const supabase = getSupabaseClient()
    let cancelled = false
    void supabase
      .from('classes')
      .select('class_code')
      .eq('id', classId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        const code = (data as { class_code?: unknown } | null)?.class_code
        setClassCode(typeof code === 'string' ? code : null)
      })
    return () => {
      cancelled = true
    }
  }, [classId])

  useEffect(() => {
    const kids = match.kids
    if (kids.length === 0) return
    let cancelled = false
    void fetchParentClassForms(kids.map((child) => ({ childId: child.id, classId })))
      .then(async (map) => {
        if (cancelled) return
        const byTemplate = new Map<string, ParentClassForm & { unsignedChildId: string | null }>()
        for (const child of kids) {
          for (const form of map.get(formComplianceKey(child.id, classId)) ?? []) {
            const existing = byTemplate.get(form.templateId)
            if (!existing) {
              byTemplate.set(form.templateId, {
                ...form,
                unsignedChildId: form.signed ? null : child.id,
              })
              continue
            }
            existing.signed = existing.signed && form.signed
            if (!form.signed && !existing.unsignedChildId) existing.unsignedChildId = child.id
          }
        }
        setForms([...byTemplate.values()])
        const { data } = await getSupabaseClient()
          .from('form_submissions')
          .select('template_id, signed_at, child_id')
          .eq('class_id', classId)
          .in('child_id', kids.map((child) => child.id))
        if (cancelled) return
        const latest = new Map<string, string>()
        const seen = new Map<string, number>()
        for (const row of data ?? []) {
          const record = row as { template_id?: unknown; signed_at?: unknown; child_id?: unknown }
          if (typeof record.template_id !== 'string' || typeof record.signed_at !== 'string' || typeof record.child_id !== 'string') continue
          seen.set(record.template_id, (seen.get(record.template_id) ?? 0) + 1)
          const previous = latest.get(record.template_id)
          if (!previous || record.signed_at > previous) latest.set(record.template_id, record.signed_at)
        }
        const signed = new Map<string, string>()
        for (const [templateId, count] of seen) {
          if (count >= kids.length) {
            const at = latest.get(templateId)
            if (at) signed.set(templateId, at)
          }
        }
        setSignedAtByTemplate(signed)
      })
      .catch(() => {
        if (!cancelled) setForms([])
      })
    return () => {
      cancelled = true
    }
  }, [classId, match.kids])

  async function copyCode() {
    if (!classCode) return
    try {
      await navigator.clipboard.writeText(classCode)
      setToast('Class code copied.')
    } catch {
      setToast(classCode)
    }
  }

  async function leave(childId: string) {
    if (!user?.id) return
    setLeaving(true)
    setActionError(null)
    try {
      await leaveClassEnrollment(user.id, childId, classId)
      setConfirmLeaveId(null)
      await refresh()
    } catch (err) {
      setActionError(formatAppError(err))
    } finally {
      setLeaving(false)
    }
  }

  return (
    <AppLayout
      title="Class"
      subtitle={match.enrollment?.className ?? 'Class'}
      onBack={onBack}
      backLabel="← Back"
    >
      {loading ? (
        <p className="pb-8 text-body-md text-on-surface-variant">Loading class…</p>
      ) : error ? (
        <p role="alert" className="pb-8 text-body-md text-error">{error}</p>
      ) : !match.enrollment ? (
        <div className="flex flex-col items-start gap-3 pb-8">
          <p className="text-body-md text-on-surface-variant">None of your swimmers are in this class.</p>
          <Button type="button" variant="secondary" className="rounded-full" onClick={() => onNavigate(PARENT_CLASSES_PATH)}>
            Back to classes
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6 pb-10">
          <ClassContextBanner
            accent={accentForClass(classId)}
            title={match.enrollment.className ?? 'Class'}
            pill="Class"
            subtitle={match.enrollment.scheduleDetails?.trim() || 'Schedule not set'}
            wavePhase={wavePhaseFor(classId)}
            className="rounded-3xl"
          >
            <ClassDetailRows
              accent={accentForClass(classId)}
              schedule={match.enrollment.scheduleDetails?.trim() || 'Schedule not set'}
              location={match.enrollment.location?.trim() || 'Location not set'}
              instructor={match.enrollment.instructorName?.trim() || 'Coach'}
              seasonStart={match.enrollment.seasonStart}
              seasonEnd={match.enrollment.seasonEnd}
            />
          </ClassContextBanner>

          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-headline-sm text-on-surface">Class waivers</h3>
              {forms.length > 0 ? (
                <Badge tone="success" dot={false}>
                  {signedCount} of {forms.length} signed
                </Badge>
              ) : null}
            </div>
            <div className="flex flex-col gap-3 rounded-3xl bg-surface-container-lowest p-card-padding shadow-[0_4px_16px_-2px_rgba(0,100,124,0.08)]">
              {forms.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant">No waivers are assigned to this class.</p>
              ) : (
                forms.map((form) => (
                  <div key={form.templateId} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-container-low p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={cn(
                          'flex size-10 shrink-0 items-center justify-center rounded-xl',
                          form.signed ? 'bg-secondary-container text-on-secondary-container' : 'bg-tertiary-fixed text-on-tertiary-fixed',
                        )}
                      >
                        <MaterialIcon name={form.signed ? 'task_alt' : 'assignment_late'} size={20} filled />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-label-md text-on-surface">{form.title}</p>
                        <p className="text-body-sm text-on-surface-variant">
                          {form.signed
                            ? `Signed${signedAtByTemplate.get(form.templateId) ? ` ${new Date(signedAtByTemplate.get(form.templateId)!).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}` : ''}`
                            : 'Sign required'}
                        </p>
                      </div>
                    </div>
                    <Badge
                      tone={form.signed ? 'success' : 'warning'}
                      onClick={
                        !form.signed && form.unsignedChildId
                          ? () =>
                              onNavigate(
                                parentWaiverPath(form.unsignedChildId!, form.templateId, classId),
                              )
                          : undefined
                      }
                    >
                      {form.signed ? 'Signed' : 'Sign required'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="px-1 text-headline-sm text-on-surface">Class details</h3>
            <div className="flex flex-col gap-4 rounded-3xl bg-surface-container-lowest p-card-padding shadow-[0_4px_16px_-2px_rgba(0,100,124,0.08)]">
              <div className="flex items-center gap-3">
                <ProfileAvatar name={match.enrollment.instructorName ?? 'Coach'} size="lg" />
                <div>
                  <h4 className="text-headline-sm text-on-surface">{match.enrollment.instructorName?.trim() || 'Coach'}</h4>
                  <p className="text-body-sm text-on-surface-variant">Lead instructor</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <button type="button" className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-surface-container text-label-md text-primary" onClick={() => setToast('Messaging the coach isn’t available yet.')}>
                  <MaterialIcon name="chat" size={20} />
                  Message
                </button>
                <button type="button" className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-surface-container text-label-md text-primary" onClick={() => setToast('Coach email isn’t on file yet.')}>
                  <MaterialIcon name="mail" size={20} />
                  Email coach
                </button>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-3xl bg-surface-container-lowest p-card-padding shadow-[0_4px_16px_-2px_rgba(0,100,124,0.08)]">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-surface-container text-primary">
                <MaterialIcon name="location_on" size={24} />
              </div>
              <div>
                <h4 className="text-label-lg text-on-surface">Pool</h4>
                <p className="text-body-md text-on-surface-variant">{match.enrollment.location?.trim() || 'Location not set'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-3xl bg-surface-container-lowest p-card-padding shadow-[0_4px_16px_-2px_rgba(0,100,124,0.08)]">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary-container/50 text-secondary">
                <MaterialIcon name="date_range" size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-label-lg text-on-surface">Season dates</h4>
                  {progress ? (
                    <span className="rounded-full bg-secondary-container px-2 py-0.5 text-label-sm text-on-secondary-container">
                      {progress.label}
                    </span>
                  ) : null}
                </div>
                <p className="text-body-md text-on-surface-variant">{season?.replace(/^Season:\s*/, '') || 'Season dates not set'}</p>
                {progress ? (
                  <>
                    <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-surface-container">
                      <div className="h-full rounded-full bg-secondary" style={{ width: `${progress.percent}%` }} />
                    </div>
                    <p className="mt-1.5 text-body-sm font-semibold text-secondary">{progress.percent}% of the season</p>
                  </>
                ) : null}
              </div>
            </div>

            {classCode ? (
              <div className="flex items-center justify-between gap-3 rounded-3xl bg-surface-container-lowest p-card-padding shadow-[0_4px_16px_-2px_rgba(0,100,124,0.08)]">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-surface-container text-primary">
                    <MaterialIcon name="tag" size={22} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-body-sm text-on-surface-variant">Class code</p>
                    <p className="truncate font-mono text-headline-sm tracking-wide text-on-surface">{classCode}</p>
                  </div>
                </div>
                <button type="button" className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-primary-fixed px-3.5 text-label-md text-on-primary-fixed-variant" onClick={() => void copyCode()}>
                  <MaterialIcon name="content_copy" size={18} />
                  Copy code
                </button>
              </div>
            ) : null}
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="px-1 text-headline-sm text-on-surface">Enrollment</h3>
            <div className="flex flex-col gap-4 rounded-3xl bg-surface-container-lowest p-card-padding shadow-[0_4px_16px_-2px_rgba(0,100,124,0.08)]">
              <button
                type="button"
                className="flex h-[50px] w-full items-center justify-between rounded-2xl bg-surface-container-low px-4 text-label-lg text-primary"
                onClick={() => setToast('Class transfers aren’t available yet.')}
              >
                <span className="inline-flex items-center gap-2.5">
                  <MaterialIcon name="swap_horiz" size={22} />
                  Request class transfer
                </span>
                <MaterialIcon name="chevron_right" size={20} className="text-outline" />
              </button>
              {match.kids.map((swimmer) => (
                <div key={swimmer.id} className="flex flex-col gap-3 rounded-2xl bg-error-container/40 p-4">
                  <div>
                    <h4 className="text-label-lg text-on-surface">Leave class</h4>
                    <p className="mt-1 text-body-sm text-on-surface-variant">
                      {swimmer.firstName} {swimmer.lastName} gives up this spot. Rejoining needs the class code again.
                    </p>
                  </div>
                  {confirmLeaveId === swimmer.id ? (
                    <div className="flex gap-2">
                      <Button type="button" className="h-11 flex-1 rounded-full bg-error" disabled={leaving} onClick={() => void leave(swimmer.id)}>
                        {leaving ? 'Leaving…' : 'Yes, leave class'}
                      </Button>
                      <Button type="button" variant="secondary" className="h-11 rounded-full" onClick={() => setConfirmLeaveId(null)}>
                        Keep spot
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="flex h-[46px] w-full items-center justify-center gap-1.5 rounded-full bg-surface-container-lowest text-label-md text-error"
                      onClick={() => setConfirmLeaveId(swimmer.id)}
                    >
                      <MaterialIcon name="person_remove" size={18} />
                      Leave class
                    </button>
                  )}
                </div>
              ))}
              {actionError ? <p className="text-body-sm text-error">{actionError}</p> : null}
            </div>
          </section>
        </div>
      )}

      {toast ? (
        <div className="pointer-events-none fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-inverse-surface px-4 py-2.5 text-label-md text-inverse-on-surface shadow-lg" role="status">
          <MaterialIcon name="check_circle" size={18} className="text-secondary-fixed" />
          {toast}
        </div>
      ) : null}
    </AppLayout>
  )
}
