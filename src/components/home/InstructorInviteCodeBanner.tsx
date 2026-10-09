import { useState, type FormEvent } from 'react'
import { normalizeClassCodeInput } from '../../lib/classCode'
import { ClassContextBanner } from './ClassContextBanner'
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
    const trimmed = normalizeClassCodeInput(value)
    if (!trimmed) {
      setFeedback(null)
      return
    }
    onChange(trimmed)
    setFeedback('Code saved — finish enrolling on the next screen.')
    onJoin()
  }

  return (
    <section className={className}>
      <ClassContextBanner
        accent="primary"
        pill="Join a class"
        title="Have a class code?"
        subtitle="Ask your coach for their 6-character code to connect swimmer records."
        driftWaves
      >
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={handleSubmit}>
          <div className="relative flex-1">
            <input
              type="text"
              value={value}
              onChange={(event) => {
                setFeedback(null)
                onChange(event.target.value)
              }}
              onBlur={(event) => {
                onChange(normalizeClassCodeInput(event.target.value))
              }}
              placeholder="A B C 1 2 3"
              autoComplete="off"
              spellCheck={false}
              className="h-12 w-full rounded-2xl border border-outline-variant/30 bg-surface-container-low py-0 pl-10 pr-3 text-label-md text-on-surface uppercase tracking-wider shadow-sm outline-none transition-all placeholder:normal-case placeholder:tracking-normal placeholder:text-outline-variant focus:ring-2 focus:ring-primary"
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
          <p className="mt-2 flex items-center gap-1.5 text-label-sm text-secondary" role="status">
            <MaterialIcon name="check_circle" size={16} className="text-secondary" filled />
            {feedback}
          </p>
        ) : null}
      </ClassContextBanner>
    </section>
  )
}
