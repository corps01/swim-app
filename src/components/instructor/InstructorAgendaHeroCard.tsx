import type { AgendaSession } from '../../lib/api/agenda'
import { greetingForTimeZone } from '../../lib/agendaSessionTiming'
import { DriftWaves } from '../graphics/DriftWaves'
import { MaterialIcon } from '../ui'

interface InstructorAgendaHeroCardProps {
  instructorName: string
  timeZone: string
  sessions: AgendaSession[]
  facilityLabel: string
}

function agendaMetrics(sessions: AgendaSession[]) {
  const swimmerIds = new Set<string>()
  let safetyFlags = 0

  for (const session of sessions) {
    for (const swimmer of session.swimmers) {
      swimmerIds.add(swimmer.childId)
      if (swimmer.hasMedicalFlag || swimmer.hasFormAlert) {
        safetyFlags += 1
      }
    }
  }

  return {
    classCount: sessions.length,
    swimmerCount: swimmerIds.size,
    safetyFlags,
  }
}

export function InstructorAgendaHeroCard({
  instructorName,
  timeZone,
  sessions,
  facilityLabel,
}: InstructorAgendaHeroCardProps) {
  const firstName = instructorName.trim().split(/\s+/)[0] ?? 'Coach'
  const greeting = greetingForTimeZone(timeZone)
  const metrics = agendaMetrics(sessions)

  return (
    <div className="relative overflow-hidden rounded-lg bg-surface-container-lowest p-card-padding shadow-[0_4px_16px_-2px_rgba(8,145,178,0.08),0_2px_6px_-1px_rgba(15,23,42,0.04)]">
      <div
        className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-primary-fixed/20 blur-2xl"
        aria-hidden
      />
      <DriftWaves align="end" />

      <div className="relative z-10 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1 truncate text-label-sm text-primary">
            <MaterialIcon name="pool" size={16} className="shrink-0" />
            <span className="truncate">{facilityLabel}</span>
          </span>
          {sessions.length > 0 ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary-fixed/50 px-2.5 py-0.5 text-label-sm font-semibold text-on-secondary-fixed-variant">
              <span className="size-1.5 animate-pulse rounded-full bg-secondary" aria-hidden />
              On deck today
            </span>
          ) : null}
        </div>

        <h2 className="mt-0.5 text-headline-lg-mobile tracking-tight text-on-surface">
          {greeting}, Coach {firstName}
        </h2>

        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-surface-container-low/70 p-2.5 pt-3">
          <MetricCell icon="class" label="Classes" value={metrics.classCount} />
          <Divider />
          <MetricCell icon="groups" label="Swimmers" value={metrics.swimmerCount} variant="fixed" />
          <Divider />
          <MetricCell
            icon="health_and_safety"
            label="Alerts"
            value={metrics.safetyFlags}
            variant="alert"
          />
        </div>
      </div>
    </div>
  )
}

function Divider() {
  return <div className="h-6 w-px bg-outline-variant/30" aria-hidden />
}

function MetricCell({
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
