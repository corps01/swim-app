import type { FormEvent } from 'react'
import { SignatureCanvas } from './SignatureCanvas'
import { MaterialIcon, ProfileAvatar } from '../ui'
import {
  evaluateBudsFitness,
  fitnessAnswersFromSnapshots,
  formatClearanceClock,
  type BudsFitnessStatus,
} from '../../lib/budsFitness'
import type { ParentQuestionnaire } from '../../types/questionnaire'
import { POOL_TIMEZONE_API_FALLBACK } from '../../lib/timeZone/pool'
import { cn } from '../../lib/cn'

interface BudsCheckInResultProps {
  form: ParentQuestionnaire
  swimmerName: string
  className: string | null
  instructorName: string | null
  answers: Record<string, string>
  acknowledged: boolean
  acknowledgeError: string | null
  signatureError?: string
  submitting: boolean
  error: string | null
  signerName?: string | null
  onAcknowledge: (value: boolean) => void
  onSignature: (dataUrl: string | null) => void
  onSubmit: (event: FormEvent) => void
  onBackToQuestions: () => void
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || 'your swimmer'
}

function symptomLine(form: ParentQuestionnaire, answers: Record<string, string>): string | null {
  const parsed = fitnessAnswersFromSnapshots(
    form.questions.map((question) => ({
      question_text: question.questionText,
      input_type: question.inputType,
      answer: answers[question.questionId] ?? '',
    })),
  )
  const parts: string[] = []
  if (parsed.fever) parts.push('Fever since the last lesson')
  if (parsed.vomiting) parts.push('Vomiting since the last lesson')
  if (parsed.diarrhea) parts.push('Diarrhea since the last lesson')
  return parts.length > 0 ? parts.join(' · ') : null
}

const returnSteps = [
  { title: '24 hours fever-free', detail: 'Temperature under 100°F without fever-reducing medicine.' },
  { title: '48 hours gastro-clear', detail: 'No vomiting or diarrhea for 48 hours before the next lesson.' },
  { title: 'Full energy restored', detail: 'Ready to kick, float, and splash with the coach and the class.' },
]

export function BudsCheckInResult({
  form,
  swimmerName,
  instructorName,
  answers,
  acknowledged,
  acknowledgeError,
  signatureError,
  submitting,
  error,
  signerName,
  onAcknowledge,
  onSignature,
  onSubmit,
  onBackToQuestions,
}: BudsCheckInResultProps) {
  const name = firstName(swimmerName)
  const coach = instructorName?.trim() || 'Your coach'
  const timeZone = form.timeZone?.trim() || POOL_TIMEZONE_API_FALLBACK
  const snapshots = form.questions.map((question) => ({
    question_text: question.questionText,
    input_type: question.inputType,
    answer: answers[question.questionId] ?? '',
  }))
  const evaluation = evaluateBudsFitness(snapshots, new Date(), timeZone)
  const status: BudsFitnessStatus = evaluation.status
  const symptom = symptomLine(form, answers)
  const stayHome = status === 'NOT_FIT'
  const clearance =
    status === 'HOLD_DIET' && evaluation.clearanceAt
      ? formatClearanceClock(evaluation.clearanceAt, timeZone)
      : null

  const hero = stayHome
    ? {
        icon: 'bedtime',
        title: `${name} should stay home and rest today`,
        body: `Resting keeps ${name} on a faster path back to the pool and keeps the water safe for the rest of the class.`,
        wrap: 'bg-gradient-to-br from-error-container via-surface-container-low to-surface-container-lowest',
        iconWrap: 'bg-tertiary text-on-tertiary',
      }
    : status === 'HOLD_DIET'
      ? {
          icon: 'restaurant',
          title: clearance ? `${name} can swim at ${clearance}` : `${name} is inside the meal window`,
          body: 'The two-hour meal rule is still running. The deck will hold water entry until that window closes.',
          wrap: 'bg-gradient-to-br from-tertiary-fixed via-surface-container-low to-surface-container-lowest',
          iconWrap: 'bg-tertiary text-on-tertiary',
        }
      : status === 'FLAGGED_CAUTION'
        ? {
            icon: 'bedtime',
            title: `${name} can swim, with a low-sleep note`,
            body: 'Sleep was under 6 hours. The lesson can still happen. The coach will see the caution on the deck.',
            wrap: 'bg-gradient-to-br from-primary-fixed via-surface-container-low to-surface-container-lowest',
            iconWrap: 'bg-primary text-on-primary',
          }
        : {
            icon: 'verified',
            title: `${name} is cleared to swim`,
            body: 'Nothing on today’s check-in blocks the pool. Send it so the coach can see a clear deck badge.',
            wrap: 'bg-gradient-to-br from-secondary-container/70 via-surface-container-low to-surface-container-lowest',
            iconWrap: 'bg-secondary text-on-secondary',
          }

  return (
    <form className="flex flex-col gap-4 pb-10" onSubmit={onSubmit}>
      <button
        type="button"
        className="inline-flex items-center gap-1 self-start text-label-md text-primary"
        onClick={onBackToQuestions}
      >
        <MaterialIcon name="arrow_back" size={18} />
        Edit answers
      </button>

      <section className={cn('relative overflow-hidden rounded-3xl p-card-padding shadow-sm', hero.wrap)}>
        <div className="flex items-start gap-3">
          <div className={cn('flex size-12 shrink-0 items-center justify-center rounded-full shadow-md', hero.iconWrap)}>
            <MaterialIcon name={hero.icon} size={24} filled />
          </div>
          <div className="min-w-0">
            <h1 className="text-headline-lg-mobile leading-snug text-on-surface">{hero.title}</h1>
            <p className="mt-1 text-body-md text-on-surface-variant">{hero.body}</p>
          </div>
        </div>
        {symptom ? (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-surface-container-lowest/80 px-3 py-3 text-on-error-container backdrop-blur-sm">
            <MaterialIcon name="thermostat" size={18} filled className="shrink-0 text-tertiary" />
            <span className="shrink-0 text-label-md">Reported symptom:</span>
            <span className="truncate text-body-md font-medium text-on-surface">{symptom}</span>
          </div>
        ) : null}
      </section>

      <section className="flex items-start gap-3 rounded-3xl bg-surface-container p-card-padding">
        <div className="relative shrink-0">
          <ProfileAvatar name={coach} />
          <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-secondary text-on-secondary">
            <MaterialIcon name="check" size={10} filled />
          </span>
        </div>
        <div className="min-w-0">
          <h3 className="text-headline-sm text-on-surface">Instructor: {coach} will be notified</h3>
          <p className="text-body-sm text-on-surface-variant">
            {stayHome
              ? `Sending this marks ${name} excused on the deck. A direct message to the coach is coming later.`
              : `Sending this puts today’s result on ${coach}’s deck before the lesson.`}
          </p>
        </div>
      </section>

      {stayHome ? (
        <section className="flex flex-col gap-3 rounded-3xl bg-surface-container-low p-card-padding">
          <div className="flex items-center gap-2">
            <MaterialIcon name="event_available" size={20} className="text-primary" />
            <h3 className="text-headline-sm text-on-surface">When can {name} splash back?</h3>
          </div>
          {returnSteps.map((step, index) => (
            <div key={step.title} className="flex items-start gap-3">
              <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-label-sm text-primary">
                {index + 1}
              </div>
              <div>
                <p className="text-label-md text-on-surface">{step.title}</p>
                <p className="text-body-sm text-on-surface-variant">{step.detail}</p>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <section className="flex flex-col gap-3 rounded-3xl bg-surface-container-lowest p-card-padding shadow-sm">
        <div className="flex items-center gap-2">
          <MaterialIcon name="draw" size={20} className="text-primary" />
          <h3 className="text-headline-sm text-on-surface">Parent acknowledgment</h3>
        </div>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => onAcknowledge(event.target.checked)}
            className="mt-1 size-5 shrink-0 accent-primary"
          />
          <span className="text-body-md leading-snug text-on-surface">
            {stayHome
              ? `I acknowledge ${name} will not attend today’s session and I understand the return-to-pool timeline.`
              : `I confirm these answers are accurate and ${name} should follow today’s result.`}
          </span>
        </label>
        {acknowledgeError ? <p className="text-body-sm text-error">{acknowledgeError}</p> : null}
        <SignatureCanvas
          label="Guardian signature"
          hint="Sign here with your finger"
          signerName={signerName}
          error={signatureError}
          onChange={onSignature}
        />
      </section>

      {error ? <p className="text-body-sm text-error">{error}</p> : null}

      <button
        type="submit"
        disabled={submitting || !acknowledged}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-label-lg text-on-primary shadow-[0_4px_16px_rgba(0,100,124,0.25)] active:scale-[0.98] disabled:opacity-60"
      >
        <MaterialIcon name="check_circle" size={20} />
        {submitting ? 'Sending…' : stayHome ? 'Confirm and send to coach' : 'Send check-in to coach'}
      </button>

      <div className="flex items-center justify-center gap-3">
        <button type="button" className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-label-md text-primary">
          <MaterialIcon name="chat" size={18} />
          Message {coach.split(' ')[0]}
        </button>
        <span className="text-outline-variant">•</span>
        <button type="button" className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-label-md text-on-surface-variant">
          <MaterialIcon name="call" size={18} />
          Pool desk
        </button>
      </div>
      <p className="pb-2 text-center text-body-sm text-on-surface-variant">
        Coach chat is not live yet. Sending the check-in still saves today’s result.
      </p>
    </form>
  )
}
