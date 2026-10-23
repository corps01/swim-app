import type { DeckFitnessStatus } from '../../lib/budsFitness'
import { Badge, type BadgeTone } from '../ui'

const tones: Record<DeckFitnessStatus, { label: string; tone: BadgeTone }> = {
  CLEARED: { label: 'Clear', tone: 'success' },
  NOT_FIT: { label: 'Stay home', tone: 'danger' },
  HOLD_DIET: { label: 'Meal hold', tone: 'warning' },
  FLAGGED_CAUTION: { label: 'Low sleep', tone: 'warning' },
  MISSING: { label: 'No BUDS', tone: 'primary' },
  DECK_CLEARED: { label: 'Deck cleared', tone: 'success' },
}

export function FitnessDeckBadge({ status }: { status: DeckFitnessStatus }) {
  const tone = tones[status]
  return (
    <Badge tone={tone.tone} pulse={tone.tone === 'warning'} aria-label={`Fitness: ${tone.label}`}>
      {tone.label}
    </Badge>
  )
}
