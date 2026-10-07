import { Droplets } from 'lucide-react'

interface GreetingBannerProps {
  parentName: string
  swimmerCount: number
  pendingForms: number
}

export function GreetingBanner({
  parentName,
  swimmerCount,
  pendingForms,
}: GreetingBannerProps) {
  const firstName = parentName.split(' ')[0] || 'there'

  return (
    <section
      className="relative overflow-hidden rounded-lg bg-gradient-to-br from-surface-container-high via-surface-container to-surface-container-low p-card-padding shadow-[0_4px_20px_-2px_rgba(0,100,124,0.08)]"
    >
      <div
        className="pointer-events-none absolute -right-6 -bottom-8 h-28 w-28 rounded-full bg-primary-fixed/40 blur-2xl"
        aria-hidden
      />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          {pendingForms > 0 ? (
            <p className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-surface-container-lowest/80 px-2.5 py-0.5 text-label-sm text-secondary shadow-sm">
              <span className="size-2 animate-pulse rounded-full bg-secondary-fixed-dim" aria-hidden />
              {pendingForms} form{pendingForms === 1 ? '' : 's'} due before class
            </p>
          ) : null}
          <h2 className="text-headline-lg-mobile text-on-surface tracking-tight">
            Good morning, {firstName}
          </h2>
          <p className="mt-0.5 text-body-md text-on-surface-variant">
            {swimmerCount === 0
              ? 'Enroll a swimmer to get started.'
              : `${swimmerCount} swimmer${swimmerCount === 1 ? '' : 's'} on your roster`}
          </p>
        </div>
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-container-lowest text-primary shadow-[0_2px_8px_rgba(0,100,124,0.12)]"
          aria-hidden
        >
          <Droplets className="size-[22px]" />
        </div>
      </div>
    </section>
  )
}
