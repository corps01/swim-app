import { wavePhaseFor } from '../graphics/DriftWaves'
import { ClassOverviewCard } from '../home/ClassOverviewCard'
import { accentForClass } from '../../lib/classAccent'
import { formatSeasonRangeLabel } from '../../lib/classSchedule'
import type { SwimClass } from '../../types/class'

interface InstructorClassCardProps {
  classRow: SwimClass
  swimmerCount: number
  hasScheduleRules?: boolean
  seasonStart?: string | null
  seasonEnd?: string | null
  listIndex?: number
  instructorName?: string
  onOpenDetails: () => void
}

export function InstructorClassCard({
  classRow,
  swimmerCount,
  hasScheduleRules = true,
  seasonStart = null,
  seasonEnd = null,
  listIndex = 0,
  instructorName = 'Coach',
  onOpenDetails,
}: InstructorClassCardProps) {
  return (
    <ClassOverviewCard
      accent={accentForClass(classRow.id, listIndex)}
      title={classRow.name}
      instructor={instructorName}
      schedule={classRow.schedule_details?.trim() || 'Schedule not set'}
      location={classRow.location?.trim() || 'Location not set'}
      season={formatSeasonRangeLabel(seasonStart, seasonEnd)}
      wavePhase={wavePhaseFor(classRow.id, listIndex)}
      swimmerCount={swimmerCount}
      onOpen={onOpenDetails}
      openLabel="Open class"
      footer={
        <p className={`text-label-md text-on-surface ${swimmerCount === 0 ? '' : 'mt-2'}`}>
          {swimmerCount === 1 ? '1 swimmer on the roster' : `${swimmerCount} swimmers on the roster`}
          {!hasScheduleRules ? ' · Not on Today until weekly times are added.' : ''}
        </p>
      }
    />
  )
}
