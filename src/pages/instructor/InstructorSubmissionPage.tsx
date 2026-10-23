import { useEffect, useState } from 'react'
import { AppLayout } from '../../components/layout'
import { MaterialIcon, ProfileAvatar, Spinner } from '../../components/ui'
import { fetchFormSubmissionReview } from '../../lib/api/forms'
import { formatAppError } from '../../lib/errors'
import { formatAnswer } from '../../lib/formQuestions'
import { ageFromDateOfBirth } from '../../lib/swimmers'
import type { AnswerSnapshot, FormSubmissionReview } from '../../types/questionnaire'

interface InstructorSubmissionPageProps {
  submissionId: string
  onBack: () => void
}

function formatSignedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}


function AnswerCard({ answer, index }: { answer: AnswerSnapshot; index: number }) {
  const label = formatAnswer(answer.input_type, answer.answer)
  const compact = Boolean(label) && (answer.input_type === 'yes_no' || answer.input_type === 'select' || label.length <= 40)

  return (
    <li className="flex flex-col gap-2.5 rounded-xl bg-surface-container-lowest p-card-padding shadow-[0_2px_10px_rgba(0,100,124,0.05)]">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-container text-label-sm text-primary">
          {index + 1}
        </span>
        <p className="text-body-md leading-snug text-on-surface">{answer.question_text}</p>
      </div>
      {label && compact ? (
        <div className="flex w-full items-center justify-between gap-3 pl-7 pt-1">
          <span className="text-body-sm text-on-surface-variant">Response</span>
          <span className="inline-flex max-w-[70%] items-center gap-1.5 rounded-full bg-secondary-container px-3 py-1.5 text-label-md text-on-secondary-container shadow-sm">
            <MaterialIcon name="check_circle" size={16} filled />
            <span className="truncate">{label}</span>
          </span>
        </div>
      ) : (
        <div className="pl-7 pt-1">
          <p className="text-body-sm text-on-surface-variant">Response</p>
          <p className="mt-1 whitespace-pre-wrap text-body-md text-on-surface">{label || '—'}</p>
        </div>
      )}
    </li>
  )
}

export function InstructorSubmissionPage({ submissionId, onBack }: InstructorSubmissionPageProps) {
  const [review, setReview] = useState<FormSubmissionReview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      setReview(null)
      try {
        const next = await fetchFormSubmissionReview(submissionId)
        if (cancelled) return
        if (!next) {
          setError('This signed form could not be found.')
          return
        }
        setReview(next)
      } catch (err) {
        if (!cancelled) setError(formatAppError(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [submissionId])

  const age = review?.swimmerDateOfBirth ? ageFromDateOfBirth(review.swimmerDateOfBirth) : null
  const answered = review?.answers.filter((answer) => answer.answer.trim()).length ?? 0

  return (
    <AppLayout
      title={review?.swimmerName ?? 'Signed form'}
      subtitle={review?.templateTitle ?? 'Questionnaire submission'}
      onBack={onBack}
      backLabel="← Back"
    >
      {loading ? (
        <Spinner className="pb-8" label="Loading signed form…" />
      ) : error || !review ? (
        <p className="pb-8 text-body-md text-error" role="alert">
          {error ?? 'This signed form could not be found.'}
        </p>
      ) : (
        <article className="submission-sheet flex flex-col pb-36">
          <div className="flex items-center justify-end py-2">
            <div className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-secondary-container px-3 text-on-secondary-container shadow-sm">
              <MaterialIcon name="verified" size={16} filled />
              <span className="text-label-sm uppercase tracking-wider">Form Signed</span>
            </div>
          </div>

          <div className="mb-4 mt-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="block text-label-sm font-bold uppercase tracking-widest text-primary">
                {review.templateTitle}
              </span>
              <h2 className="text-headline-lg-mobile text-on-surface">Form details</h2>
            </div>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MaterialIcon name="assignment_turned_in" size={24} />
            </div>
          </div>

          <section className="relative mb-stack-loose overflow-hidden rounded-lg bg-surface-container-lowest p-card-padding shadow-[0_4px_16px_-2px_rgba(0,100,124,0.08),0_2px_6px_-1px_rgba(15,23,42,0.04)]">
            <div className="pointer-events-none absolute -bottom-6 -right-6 size-24 rounded-full bg-secondary-container/20" />
            <div className="absolute right-0 top-0 flex h-7 items-center gap-1 rounded-bl-xl bg-surface-container px-3 text-label-sm text-on-surface-variant">
              <MaterialIcon name="lock" size={14} />
              Read-only record
            </div>

            <div className="mb-3 flex items-center gap-3.5 pb-3 pr-24">
              <div className="relative">
                <ProfileAvatar name={review.swimmerName} size="lg" />
                <div className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-secondary text-on-secondary">
                  <MaterialIcon name="check" size={12} filled />
                </div>
              </div>
              <div className="min-w-0">
                <h3 className="text-headline-sm leading-tight text-on-surface">{review.swimmerName}</h3>
                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-body-sm text-on-surface-variant">
                  {age !== null ? <span>Age {age}</span> : null}
                  {age !== null && review.className ? <span className="size-1 rounded-full bg-outline-variant" /> : null}
                  {review.className ? <span className="font-medium text-primary">{review.className}</span> : null}
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-2 rounded-xl bg-surface-container-low/60 p-3">
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-body-sm text-on-surface-variant">
                  <MaterialIcon name="person" size={16} className="text-primary" />
                  Parent
                </dt>
                <dd className="text-right text-label-md font-semibold text-on-surface">{review.parentName}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-body-sm text-on-surface-variant">
                  <MaterialIcon name="schedule" size={16} className="text-primary" />
                  Signed
                </dt>
                <dd className="text-right text-body-sm font-medium text-on-surface">{formatSignedAt(review.signedAt)}</dd>
              </div>
            </dl>
          </section>

          <section className="mb-stack-loose">
            <div className="mb-3 flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2">
                <MaterialIcon name="health_and_safety" size={20} className="text-primary" />
                <h3 className="text-headline-sm text-on-surface">Parent answers</h3>
              </div>
              {review.answers.length > 0 ? (
                <span className="rounded-full bg-secondary-container/60 px-2.5 py-1 text-label-sm font-semibold text-on-secondary-container">
                  {answered} / {review.answers.length} answered
                </span>
              ) : null}
            </div>
            {review.answers.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">No answers were recorded.</p>
            ) : (
              <ol className="flex flex-col gap-3">
                {review.answers.map((answer, index) => (
                  <AnswerCard key={`${answer.question_text}-${index}`} answer={answer} index={index} />
                ))}
              </ol>
            )}
          </section>

          <section className="submission-signature mb-4">
            <div className="mb-3 flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2">
                <MaterialIcon name="draw" size={20} className="text-primary" />
                <h3 className="text-headline-sm text-on-surface">Parent signature</h3>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-label-sm text-primary">
                <MaterialIcon name="lock" size={14} />
                Read-only
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-lg bg-surface-container-lowest p-card-padding shadow-[0_4px_16px_-2px_rgba(0,100,124,0.08)]">
              {review.legalTextSnapshot ? (
                <div className="rounded-xl bg-surface-container-low p-3">
                  <p className="whitespace-pre-wrap text-body-sm italic leading-relaxed text-on-surface-variant">
                    “{review.legalTextSnapshot}”
                  </p>
                </div>
              ) : null}
              <div className="relative flex h-32 w-full items-center justify-center overflow-hidden rounded-xl bg-surface-bright p-3">
                <span className="absolute left-3 top-2 text-label-sm uppercase tracking-widest text-on-surface-variant/40">
                  Digital signature
                </span>
                {review.signatureDataUrl ? (
                  <img
                    src={review.signatureDataUrl}
                    alt={`Signature for ${review.swimmerName}`}
                    className="mt-3 h-16 w-full object-contain px-6 pb-4"
                  />
                ) : (
                  <p className="text-body-sm text-on-surface-variant">No signature was recorded.</p>
                )}
                {review.signatureDataUrl ? (
                  <span className="absolute bottom-2 right-3 inline-flex items-center gap-1 rounded-full bg-surface-container-highest px-2 py-0.5 text-label-sm text-on-surface-variant">
                    <MaterialIcon name="verified" size={12} className="text-primary" />
                    Signed
                  </span>
                ) : null}
              </div>
              <p className="px-1 text-body-sm text-on-surface-variant">{formatSignedAt(review.signedAt)}</p>
            </div>
          </section>
        </article>
      )}

      {review ? (
        <div className="no-print fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-md flex-col gap-2 bg-surface/90 p-margin-screen pb-safe shadow-[0_-8px_24px_rgba(0,100,124,0.08)] backdrop-blur-xl print:hidden">
          <button
            type="button"
            className="flex h-touch-action w-full items-center justify-center gap-2 rounded-full bg-primary text-label-lg text-on-primary shadow-[0_12px_28px_-4px_rgba(0,100,124,0.28)] active:scale-95"
            onClick={() => window.print()}
          >
            <MaterialIcon name="print" size={22} />
            Print / Save PDF
          </button>
          <button
            type="button"
            className="flex h-11 w-full items-center justify-center rounded-full text-label-md text-primary active:scale-95"
            onClick={onBack}
          >
            Close
          </button>
        </div>
      ) : null}
    </AppLayout>
  )
}
