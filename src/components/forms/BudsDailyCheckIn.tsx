import { useState, type FormEvent } from 'react'
import { BudsCheckInResult } from './BudsCheckInResult'
import { Field, MaterialIcon, ProfileAvatar } from '../ui'
import { controlClass } from '../ui/styles'
import { isLastMealQuestion, isSleepHoursQuestion } from '../../lib/budsFitness'
import type { ParentQuestionnaire } from '../../types/questionnaire'
import { calendarMonthDayLabel } from '../../lib/timeZone/calendar'
import { cn } from '../../lib/cn'

interface BudsDailyCheckInProps {
  form: ParentQuestionnaire
  swimmerName: string
  className: string | null
  instructorName: string | null
  answers: Record<string, string>
  fieldErrors: Record<string, string>
  signatureError?: string
  acknowledged: boolean
  acknowledgeError: string | null
  submitting: boolean
  error: string | null
  signerName?: string | null
  onAnswer: (questionId: string, value: string) => void
  onAcknowledge: (value: boolean) => void
  onSignature: (dataUrl: string | null) => void
  onReview: () => boolean
  onSubmit: (event: FormEvent) => void
  canCloneYesterday?: boolean
  onCloneYesterday?: () => void
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || 'your swimmer'
}

function questionIcon(questionText: string): string {
  const text = questionText.toLowerCase()
  if (text.includes('fever')) return 'thermostat'
  if (text.includes('vomit') || text.includes('diarrhea') || text.includes('diarrhoea')) return 'vital_signs'
  if (isSleepHoursQuestion(questionText) || text.includes('sleep')) return 'bedtime'
  if (isLastMealQuestion(questionText) || text.includes('eat or drink')) return 'restaurant'
  return 'health_and_safety'
}

export function BudsDailyCheckIn({
  form,
  swimmerName,
  className,
  instructorName,
  answers,
  fieldErrors,
  signatureError,
  acknowledged,
  acknowledgeError,
  submitting,
  error,
  signerName,
  onAnswer,
  onAcknowledge,
  onSignature,
  onReview,
  onSubmit,
  canCloneYesterday = false,
  onCloneYesterday,
}: BudsDailyCheckInProps) {
  const [step, setStep] = useState<'questions' | 'results'>('questions')
  const name = firstName(swimmerName)
  const sessionBits = [
    form.sessionDate && form.timeZone ? `Today, ${calendarMonthDayLabel(form.sessionDate, form.timeZone)}` : 'Today',
    className,
    instructorName ? `Coach ${instructorName}` : null,
  ].filter(Boolean)

  if (step === 'results') {
    return (
      <BudsCheckInResult
        form={form}
        swimmerName={swimmerName}
        className={className}
        instructorName={instructorName}
        answers={answers}
        acknowledged={acknowledged}
        acknowledgeError={acknowledgeError}
        signatureError={signatureError}
        submitting={submitting}
        error={error}
        signerName={signerName}
        onAcknowledge={onAcknowledge}
        onSignature={onSignature}
        onSubmit={onSubmit}
        onBackToQuestions={() => setStep('questions')}
      />
    )
  }

  return (
    <form
      className="flex flex-col gap-4 pb-10"
      onSubmit={(event) => {
        event.preventDefault()
        if (!onReview()) return
        setStep('results')
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }}
    >
      <section className="relative overflow-hidden rounded-lg bg-surface-container-low p-card-padding shadow-[0_4px_16px_-2px_rgba(0,100,124,0.08)]">
        <div className="pointer-events-none absolute -bottom-6 -right-6 size-24 rounded-full bg-primary-fixed/30 blur-xl" />
        <div className="relative flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-fixed px-3 py-1 text-label-sm text-on-primary-fixed">
            <MaterialIcon name="bolt" size={16} filled className="text-primary" />
            30-second check
          </span>
          <span className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant">
            <span className="size-2 animate-pulse rounded-full bg-secondary" />
            Daily BUDS
          </span>
        </div>
        <div className="relative mt-3 flex items-center gap-3">
          <div className="relative shrink-0">
            <ProfileAvatar name={swimmerName} />
            <span className="absolute bottom-0 right-0 size-3.5 rounded-full bg-secondary ring-2 ring-surface-container-low" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5">
              <h2 className="truncate text-headline-sm font-bold text-on-surface">{swimmerName}</h2>
              {className ? <span className="truncate text-label-sm font-semibold text-primary">{className}</span> : null}
            </div>
            <p className="truncate text-body-sm text-on-surface-variant">{sessionBits.join(' · ')}</p>
          </div>
        </div>
      </section>

      <section className="flex items-center gap-3 rounded-lg bg-secondary-fixed/40 p-3.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container shadow-sm">
          <MaterialIcon name="water_drop" size={20} filled />
        </div>
        <p className="text-body-sm font-medium leading-snug text-on-secondary-fixed">
          A quick health check before the pool, so {name} and the rest of the class can splash safely.
        </p>
      </section>

      {canCloneYesterday && onCloneYesterday ? (
        <button
          type="button"
          onClick={onCloneYesterday}
          className="flex items-center justify-between gap-3 rounded-lg border border-primary/25 bg-primary-fixed/30 px-4 py-3 text-left"
        >
          <span>
            <span className="block text-label-md font-bold text-on-surface">Clone yesterday</span>
            <span className="block text-body-sm text-on-surface-variant">
              Copies the last check-in. You still enter today’s meal time and sign.
            </span>
          </span>
          <MaterialIcon name="content_copy" size={20} className="shrink-0 text-primary" />
        </button>
      ) : null}

      {form.questions.map((question) => (
        <div key={question.questionId} id={`question-${question.questionId}`}>
          {question.inputType === 'yes_no' ? (
            <div
              role="group"
              aria-labelledby={`question-label-${question.questionId}`}
              className="flex flex-col gap-3 rounded-lg bg-surface-container-lowest p-card-padding shadow-[0_4px_16px_-2px_rgba(0,100,124,0.06)]"
            >
              <div className="flex items-start gap-2.5">
                <MaterialIcon name={questionIcon(question.questionText)} size={22} className="mt-0.5 text-primary" />
                <div className="min-w-0">
                  <h3 id={`question-label-${question.questionId}`} className="text-headline-sm font-semibold text-on-surface">
                    {question.questionText}
                  </h3>
                  {question.isRequired ? <p className="mt-0.5 text-body-sm text-on-surface-variant">Required</p> : null}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                {(['yes', 'no'] as const).map((choice) => {
                  const selected = answers[question.questionId] === choice
                  const yesSelected = selected && choice === 'yes'
                  const noSelected = selected && choice === 'no'
                  return (
                    <button
                      key={choice}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onAnswer(question.questionId, choice)}
                      className={cn(
                        'flex h-14 items-center justify-center gap-2 rounded-full text-label-lg active:scale-95',
                        yesSelected && 'bg-tertiary-container text-on-tertiary-container shadow-[0_4px_12px_rgba(220,44,79,0.22)]',
                        noSelected && 'bg-secondary-fixed text-on-secondary-fixed shadow-[0_4px_12px_rgba(0,108,73,0.18)]',
                        !selected && 'bg-surface-container-low text-on-surface-variant',
                      )}
                    >
                      <MaterialIcon
                        name={choice === 'yes' ? 'warning' : 'check_circle'}
                        size={choice === 'yes' ? 20 : 22}
                        filled={noSelected}
                      />
                      {choice === 'yes' ? 'Yes' : 'No'}
                    </button>
                  )
                })}
              </div>
              {fieldErrors[question.questionId] ? (
                <p role="alert" className="text-body-sm text-error">
                  {fieldErrors[question.questionId]}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="rounded-lg bg-surface-container-lowest p-card-padding shadow-[0_4px_16px_-2px_rgba(0,100,124,0.06)]">
              <Field
                id={`answer-${question.questionId}`}
                label={question.questionText}
                hint={question.isRequired ? 'Required' : undefined}
                error={fieldErrors[question.questionId]}
              >
                {question.inputType === 'textarea' ? (
                  <textarea
                    id={`answer-${question.questionId}`}
                    value={answers[question.questionId] ?? ''}
                    rows={4}
                    aria-invalid={Boolean(fieldErrors[question.questionId])}
                    onChange={(event) => onAnswer(question.questionId, event.target.value)}
                    className={cn(controlClass, 'h-auto min-h-28 py-3')}
                  />
                ) : null}
                {question.inputType === 'text' ? (
                  <input
                    id={`answer-${question.questionId}`}
                    type={
                      isLastMealQuestion(question.questionText)
                        ? 'time'
                        : isSleepHoursQuestion(question.questionText)
                          ? 'number'
                          : 'text'
                    }
                    min={isSleepHoursQuestion(question.questionText) ? 0 : undefined}
                    max={isSleepHoursQuestion(question.questionText) ? 24 : undefined}
                    step={isSleepHoursQuestion(question.questionText) ? 0.5 : undefined}
                    value={answers[question.questionId] ?? ''}
                    aria-invalid={Boolean(fieldErrors[question.questionId])}
                    onChange={(event) => onAnswer(question.questionId, event.target.value)}
                    className={controlClass}
                  />
                ) : null}
                {question.inputType === 'select' ? (
                  <select
                    id={`answer-${question.questionId}`}
                    value={answers[question.questionId] ?? ''}
                    aria-invalid={Boolean(fieldErrors[question.questionId])}
                    onChange={(event) => onAnswer(question.questionId, event.target.value)}
                    className={controlClass}
                  >
                    <option value="">Choose one</option>
                    {question.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : null}
              </Field>
            </div>
          )}
        </div>
      ))}

      {error ? <p className="text-body-sm text-error">{error}</p> : null}

      <button
        type="submit"
        className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-headline-sm text-on-primary shadow-[0_8px_20px_-4px_rgba(0,100,124,0.35)] active:scale-[0.98]"
      >
        <span>See today’s result</span>
        <MaterialIcon name="arrow_forward" size={22} />
      </button>
    </form>
  )
}
