import { ArrowRight, AlertCircle } from 'lucide-react'
import type { SwimmerRosterEntry } from '../../lib/swimmers'
import { Button } from '../ui'

interface PendingFormBannerProps {
  swimmer: SwimmerRosterEntry
}

export function PendingFormBanner({ swimmer }: PendingFormBannerProps) {
  return (
    <section className="rounded-lg bg-tertiary-fixed p-card-padding shadow-[0_8px_24px_-4px_rgba(185,5,56,0.14)]">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-tertiary text-on-tertiary shadow-sm">
          <AlertCircle className="size-[22px]" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-headline-sm text-on-tertiary-fixed">
            Pre-session form needed
          </h3>
          <p className="mt-1 text-body-sm text-on-tertiary-fixed-variant">
            Complete {swimmer.firstName}&apos;s health form before pool entry so{' '}
            {swimmer.coachName} can approve deck admittance.
          </p>
          <Button
            type="button"
            className="mt-3 h-11 w-full bg-tertiary text-on-tertiary shadow-[0_4px_12px_rgba(185,5,56,0.25)] hover:shadow-lg"
            trailingIcon={<ArrowRight className="size-[18px]" aria-hidden />}
          >
            Complete {swimmer.firstName}&apos;s form
          </Button>
        </div>
      </div>
    </section>
  )
}
