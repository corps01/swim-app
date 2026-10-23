import { useMemo, useState } from 'react'
import { wavePhaseFor } from '../../components/graphics/DriftWaves'
import { ClassOverviewCard } from '../../components/home/ClassOverviewCard'
import { InstructorInviteCodeBanner } from '../../components/home/InstructorInviteCodeBanner'
import { ParentShell } from '../../components/navigation/ParentShell'
import { useAuth } from '../../hooks/useAuth'
import { useParentSwimmers } from '../../hooks/useParentSwimmers'
import { PARENT_CLASSES_PATH, parentEnrollPath, parentSwimmerClassPath, parentSwimmerPath } from '../../lib/appNavigation'
import { accentForClass } from '../../lib/classAccent'
import { ageFromDateOfBirth } from '../../lib/swimmers'
import { formatSeasonRangeLabel } from '../../lib/classSchedule'
import { normalizeClassCodeInput } from '../../lib/classCode'
import { setStoredPendingInviteCode } from '../../lib/pendingInvite'
import type { SwimmerClassEnrollment, SwimmerRosterEntry } from '../../lib/swimmers'
import { Card, MaterialIcon } from '../../components/ui'

interface ParentClassesPageProps {
  onNavigate: (path: string) => void
}

interface ClassGroup {
  classId: string
  enrollment: SwimmerClassEnrollment
  swimmers: SwimmerRosterEntry[]
}

function startEnrollWithInvite(code: string, onNavigate: (path: string) => void) {
  const normalized = normalizeClassCodeInput(code)
  if (!normalized) {
    onNavigate(parentEnrollPath({ from: PARENT_CLASSES_PATH }))
    return
  }
  setStoredPendingInviteCode(normalized)
  onNavigate(parentEnrollPath({ inviteCode: normalized, from: PARENT_CLASSES_PATH }))
}

export function ParentClassesPage({ onNavigate }: ParentClassesPageProps) {
  const { user } = useAuth()
  const { swimmers, loading, error } = useParentSwimmers(user?.id)
  const [inviteCode, setInviteCode] = useState('')

  const classes = useMemo(() => {
    const groups = new Map<string, ClassGroup>()
    for (const swimmer of swimmers) {
      for (const enrollment of swimmer.enrollments) {
        if (!enrollment.classId || enrollment.status === 'inactive') continue
        const existing = groups.get(enrollment.classId)
        if (existing) {
          if (!existing.swimmers.some((row) => row.id === swimmer.id)) existing.swimmers.push(swimmer)
          continue
        }
        groups.set(enrollment.classId, { classId: enrollment.classId, enrollment, swimmers: [swimmer] })
      }
    }
    return [...groups.values()].sort((a, b) =>
      (a.enrollment.className ?? '').localeCompare(b.enrollment.className ?? ''),
    )
  }, [swimmers])

  return (
    <ParentShell activePath={PARENT_CLASSES_PATH} onNavigate={onNavigate} screenTitle="Classes">
      <div className="flex flex-col gap-stack-loose pb-8 pt-2">
        <section>
          <h2 className="text-headline-lg-mobile text-on-surface">Your classes</h2>
          <p className="text-body-sm text-on-surface-variant">
            Every class your swimmers are in. Join another with a coach’s code.
          </p>
        </section>

        <InstructorInviteCodeBanner
          value={inviteCode}
          onChange={setInviteCode}
          onJoin={() => startEnrollWithInvite(inviteCode, onNavigate)}
        />

        {error ? (
          <p role="alert" className="rounded-2xl bg-error-container px-3 py-2 text-body-sm text-on-error-container">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-body-md text-on-surface-variant">Loading classes…</p>
        ) : classes.length === 0 ? (
          <Card variant="outline" className="items-center gap-2 rounded-3xl border-dashed py-8 text-center">
            <MaterialIcon name="pool" size={28} className="text-primary" />
            <p className="text-body-sm text-on-surface-variant">No classes yet. Use a class code above to enroll.</p>
          </Card>
        ) : (
          <ul className="grid grid-cols-1 gap-stack-base lg:grid-cols-2">
            {classes.map(({ classId, enrollment, swimmers: kids }, index) => (
              <li key={classId}>
                <ClassOverviewCard
                  accent={accentForClass(classId, index)}
                  title={enrollment.className ?? 'Class'}
                  status={enrollment.status === 'pending' ? 'pending' : 'active'}
                  instructor={enrollment.instructorName?.trim() || 'Coach not set'}
                  schedule={enrollment.scheduleDetails?.trim() || 'Schedule not set'}
                  location={enrollment.location?.trim() || 'Location not set'}
                  season={formatSeasonRangeLabel(enrollment.seasonStart, enrollment.seasonEnd)}
                  wavePhase={wavePhaseFor(classId, index)}
                  openLabel="Open class"
                  onOpen={() => onNavigate(parentSwimmerClassPath(kids[0].id, classId))}
                  swimmers={kids.map((swimmer) => ({
                    id: swimmer.id,
                    name: `${swimmer.firstName} ${swimmer.lastName}`.trim(),
                    age: ageFromDateOfBirth(swimmer.dateOfBirth),
                    onOpen: () => onNavigate(parentSwimmerPath(swimmer.id, { from: PARENT_CLASSES_PATH })),
                  }))}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </ParentShell>
  )
}
