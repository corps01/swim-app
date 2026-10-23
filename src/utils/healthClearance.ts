import type { DeckFitness } from '../lib/api/budsClearance'

export type DeckClearanceStatus = 'BARRED' | 'FORM_PENDING' | 'CAUTION' | 'CLEARED'

export interface DeckClearanceState {
  status: DeckClearanceStatus
  label: string
  /** Material symbol shown beside the label. */
  icon: string
  /** Tailwind classes for the single status ribbon. */
  color: string
  /** Tailwind classes for the icon and bold label. */
  accent: string
  detail: string
  canOverride: boolean
}

interface DeckClearanceChild {
  formPending?: boolean
}

/**
 * One deck status. Illness beats a missing form, which beats meal hold or low sleep.
 */
export function getDeckClearanceState(
  child: DeckClearanceChild,
  budsSubmission: DeckFitness | null | undefined,
): DeckClearanceState {
  const fitness = budsSubmission ?? null
  const formPending = Boolean(child.formPending) || fitness?.status === 'MISSING'

  if (fitness?.status === 'NOT_FIT') {
    return {
      status: 'BARRED',
      label: 'Stay home',
      icon: 'dangerous',
      color: 'bg-error-container text-on-error-container',
      accent: 'text-error',
      detail: fitness.detail?.trim() || 'Illness reported. This swimmer stays out of the pool.',
      canOverride: false,
    }
  }

  if (formPending && fitness?.status !== 'DECK_CLEARED') {
    return {
      status: 'FORM_PENDING',
      label: 'Form pending',
      icon: 'warning',
      color: 'bg-amber-50 text-amber-950',
      accent: 'text-amber-800',
      detail: 'Daily BUDS is not in yet. A verbal deck clearance can let them on deck.',
      canOverride: true,
    }
  }

  if (fitness?.status === 'HOLD_DIET' || fitness?.status === 'FLAGGED_CAUTION') {
    const mealHold = fitness.status === 'HOLD_DIET'
    return {
      status: 'CAUTION',
      label: mealHold ? 'Meal hold' : 'Low sleep',
      icon: mealHold ? 'restaurant' : 'bedtime',
      color: 'bg-amber-100 text-amber-950',
      accent: 'text-amber-800',
      detail: fitness.detail?.trim() || (mealHold ? 'Meal hold is still active.' : 'Low sleep was reported.'),
      canOverride: mealHold,
    }
  }

  return {
    status: 'CLEARED',
    label: 'Cleared',
    icon: 'verified',
    color: 'bg-emerald-50 text-emerald-900',
    accent: 'text-emerald-800',
    detail: fitness?.status === 'DECK_CLEARED' ? 'Verbal deck clearance is on file.' : 'Checks passed for today.',
    canOverride: false,
  }
}
