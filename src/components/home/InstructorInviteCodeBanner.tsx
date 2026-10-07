import { useState, type FormEvent } from 'react'
import { Button, MaterialIcon } from '../ui'

interface InstructorInviteCodeBannerProps {
  value: string
  onChange: (value: string) => void
  onJoin: () => void
  className?: string
}

export function InstructorInviteCodeBanner({
  value,
  onChange,
  onJoin,
  className,
}: InstructorInviteCodeBannerProps) {
  const [feedback, setFeedback] = useState<string | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) {
      setFeedback(null)
      return
    }
    setFeedback('Looking up invite code…')
    window.setTimeout(() => {
      setFeedback('Invite saved — continue enrolling your swimmer.')
      onJoin()
    }, 400)
  }

  return (
    <section className={className}>
      <div
        className="flex flex-col gap-3 rounded-3xl bg-gradient-to-br from-primary-fixed/40 via-surface-container-low to-surface-container-lowest p-card-padding shadow-[0_4px_16px_-2px_rgba(0,100,124,0.08)]"
      >
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-sm">
            <MaterialIcon name="vpn_key" size={22} />
          </div>
          <div className="min-w-0 flex-col">
            <h3 className="text-headline-sm leading-tight text-on-surface">
              Have an instructor&apos;s invite code?
            </h3>
            <p className="mt-0.5 text-body-sm text-on-surface-variant">
              Ask your coach for their class code to connect swimmer records.
            </p>
          </div>
        </div>

        <form className="mt-1 flex flex-col gap-2 sm:flex-row" onSubmit={handleSubmit}>
          <div className="relative flex-1">
            <input
              type="text"
              value={value}
              onChange={(event) => {
                setFeedback(null)
                onChange(event.target.value)
              }}
              placeholder="e.g. SWIM-8294 or invite UUID"
              autoComplete="off"
              spellCheck={false}
              className="h-12 w-full rounded-2xl bg-surface-container-lowest py-0 pl-10 pr-3 text-label-md text-on-surface uppercase tracking-wider shadow-sm outline-none transition-all placeholder:normal-case placeholder:tracking-normal placeholder:text-outline-variant focus:ring-2 focus:ring-primary"
            />
            <MaterialIcon
              name="qr_code_scanner"
              size={20}
              className="pointer-events-none absolute left-3 top-3 text-primary"
            />
          </div>
          <Button
            type="submit"
            size="md"
            className="h-12 shrink-0 rounded-2xl px-6 shadow-sm active:scale-95"
          >
            Join class
            <MaterialIcon name="arrow_forward" size={18} />
          </Button>
        </form>

        {feedback ? (
          <p className="flex items-center gap-1.5 text-label-sm text-secondary" role="status">
            <MaterialIcon name="check_circle" size={16} className="text-secondary" filled />
            {feedback}
          </p>
        ) : null}
      </div>
    </section>
  )
}
