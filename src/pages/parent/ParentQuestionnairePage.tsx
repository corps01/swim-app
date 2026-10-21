import { useEffect, useState, type FormEvent } from 'react'
import { AppLayout } from '../../components/layout'
import { SignatureCanvas } from '../../components/forms/SignatureCanvas'
import { Button, Field, MaterialIcon, Spinner } from '../../components/ui'
import { controlClass } from '../../components/ui/styles'
import { useAppPath } from '../../hooks/useAppPath'
import { useAuth } from '../../hooks/useAuth'
import {
  fetchParentQuestionnaire,
  SIGNATURE_AGREEMENT,
  submitFormSignature,
} from '../../lib/api/forms'
import type { AnswerSnapshot, ParentQuestionnaire } from '../../types/questionnaire'
import { fetchParentSwimmers } from '../../lib/api/swimmers'
import { parseParentQuestionnaireSearch } from '../../lib/appNavigation'
import { formatAppError } from '../../lib/errors'
import { cn } from '../../lib/cn'

interface ParentQuestionnairePageProps {
  childId: string
  onBack: () => void
  onFinished: () => void
}

export function ParentQuestionnairePage({ childId, onBack, onFinished }: ParentQuestionnairePageProps) {
  const { search } = useAppPath()
  const { classId, templateId } = parseParentQuestionnaireSearch(search)
  const { user } = useAuth()

  const [swimmerName, setSwimmerName] = useState<string | null>(null)
  const [form, setForm] = useState<ParentQuestionnaire | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [signature, setSignature] = useState<string | null>(null)
  const [signatureError, setSignatureError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      setForm(null)
      setAnswers({})
      setSignature(null)
      setFieldErrors({})
      setSignatureError(null)
      if (!classId || !templateId) {
        setLoading(false)
        return
      }
      try {
        const swimmers = user?.id ? await fetchParentSwimmers(user.id) : []
        const swimmer = swimmers.find((row) => row.id === childId)
        if (!swimmer) {
          if (!cancelled) setError('This swimmer is not on your account.')
          return
        }
        const questionnaire = await fetchParentQuestionnaire({ childId, classId, templateId })
        if (cancelled) return
        if (!questionnaire) {
          setError('This questionnaire is not assigned to this class.')
          return
        }
        setSwimmerName(`${swimmer.firstName} ${swimmer.lastName}`)
        setForm(questionnaire)
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
  }, [childId, classId, templateId, user?.id])

  function setAnswer(questionId: string, value: string) {
    setAnswers((current) => ({ ...current, [questionId]: value }))
    setFieldErrors((current) => {
      if (!current[questionId]) return current
      const next = { ...current }
      delete next[questionId]
      return next
    })
  }

  function validate(questionnaire: ParentQuestionnaire) {
    const nextErrors: Record<string, string> = {}
    for (const question of questionnaire.questions) {
      if (!question.isRequired) continue
      const value = (answers[question.questionId] ?? '').trim()
      if (question.inputType === 'yes_no' && value !== 'yes' && value !== 'no') {
        nextErrors[question.questionId] = 'Choose yes or no.'
      } else if (question.inputType === 'select' && !question.options.includes(value)) {
        nextErrors[question.questionId] = question.options.length
          ? 'Choose an option.'
          : 'This question has no options yet.'
      } else if (question.inputType !== 'yes_no' && question.inputType !== 'select' && !value) {
        nextErrors[question.questionId] = 'This answer is required.'
      }
    }
    setFieldErrors(nextErrors)
    const missingSignature = !signature
    setSignatureError(missingSignature ? 'Sign in the box to agree.' : null)
    const firstId = questionnaire.questions.find((question) => nextErrors[question.questionId])?.questionId
    if (firstId) {
      document.getElementById(`question-${firstId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    return Object.keys(nextErrors).length === 0 && !missingSignature
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!form || !classId || !templateId || !user?.id || form.alreadySigned) return
    setError(null)
    if (!validate(form)) return

    const snapshot: AnswerSnapshot[] = form.questions.map((question) => ({
      question_text: question.questionText,
      input_type: question.inputType,
      answer: (answers[question.questionId] ?? '').trim(),
    }))
    const legalText = [form.title, form.description, SIGNATURE_AGREEMENT].filter(Boolean).join('\n\n')

    setSubmitting(true)
    try {
      await submitFormSignature({
        childId,
        classId,
        templateId,
        signedBy: user.id,
        answers: snapshot,
        legalTextSnapshot: legalText,
        signatureDataUrl: signature ?? '',
      })
      onFinished()
    } catch (err) {
      setError(formatAppError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const missingLink = !classId || !templateId

  return (
    <AppLayout
      title={form?.title ?? 'Questionnaire'}
      subtitle={swimmerName ? `For ${swimmerName}` : 'Sign the form for this swimmer'}
      onBack={onBack}
      backLabel="← Back to Home"
    >
      {loading ? (
        <Spinner className="pb-8" label="Loading questionnaire…" />
      ) : missingLink ? (
        <p className="pb-8 text-body-md text-error">This questionnaire link is incomplete.</p>
      ) : error && !form ? (
        <p className="pb-8 text-body-md text-error">{error}</p>
      ) : form?.alreadySigned ? (
        <p className="pb-8 text-body-md text-on-surface">This questionnaire is already signed.</p>
      ) : form ? (
        <form className="flex flex-col gap-5 pb-10" onSubmit={(event) => void handleSubmit(event)}>
          {form.description ? (
            <p className="text-body-md text-on-surface-variant">{form.description}</p>
          ) : null}

          {form.questions.map((question) => (
            <div key={question.questionId} id={`question-${question.questionId}`} className="flex flex-col gap-2">
              {question.inputType === 'textarea' ? (
                <Field
                  id={`answer-${question.questionId}`}
                  label={question.questionText}
                  hint={question.isRequired ? 'Required' : undefined}
                  error={fieldErrors[question.questionId]}
                >
                  <textarea
                    id={`answer-${question.questionId}`}
                    value={answers[question.questionId] ?? ''}
                    rows={4}
                    aria-invalid={Boolean(fieldErrors[question.questionId])}
                    onChange={(event) => setAnswer(question.questionId, event.target.value)}
                    className={cn(controlClass, 'h-auto min-h-28 py-3')}
                  />
                </Field>
              ) : null}

              {question.inputType === 'text' ? (
                <Field
                  id={`answer-${question.questionId}`}
                  label={question.questionText}
                  hint={question.isRequired ? 'Required' : undefined}
                  error={fieldErrors[question.questionId]}
                >
                  <input
                    id={`answer-${question.questionId}`}
                    type="text"
                    value={answers[question.questionId] ?? ''}
                    aria-invalid={Boolean(fieldErrors[question.questionId])}
                    onChange={(event) => setAnswer(question.questionId, event.target.value)}
                    className={controlClass}
                  />
                </Field>
              ) : null}

              {question.inputType === 'yes_no' ? (
                <div
                  role="group"
                  aria-labelledby={`question-label-${question.questionId}`}
                  className="flex flex-col gap-3 rounded-lg bg-surface-container-lowest p-card-padding shadow-[0_4px_16px_-2px_rgba(0,100,124,0.06)]"
                >
                  <p id={`question-label-${question.questionId}`} className="text-headline-sm text-on-surface">
                    {question.questionText}
                    {question.isRequired ? (
                      <span className="ml-2 text-label-sm text-primary">Required</span>
                    ) : null}
                  </p>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {(['yes', 'no'] as const).map((choice) => {
                      const selected = answers[question.questionId] === choice
                      return (
                        <button
                          key={choice}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setAnswer(question.questionId, choice)}
                          className={cn(
                            'flex h-14 items-center justify-center gap-2 rounded-full text-label-lg active:scale-95',
                            selected
                              ? 'bg-secondary-container text-on-secondary-container shadow-[0_4px_12px_rgba(0,108,73,0.18)]'
                              : 'bg-surface-container-low text-on-surface-variant',
                          )}
                        >
                          <MaterialIcon
                            name={choice === 'yes' ? 'check_circle' : 'cancel'}
                            size={22}
                            filled={selected}
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
              ) : null}

              {question.inputType === 'select' ? (
                <Field
                  id={`answer-${question.questionId}`}
                  label={question.questionText}
                  hint={question.isRequired ? 'Required' : undefined}
                  error={fieldErrors[question.questionId]}
                >
                  <select
                    id={`answer-${question.questionId}`}
                    value={answers[question.questionId] ?? ''}
                    aria-invalid={Boolean(fieldErrors[question.questionId])}
                    onChange={(event) => setAnswer(question.questionId, event.target.value)}
                    className={controlClass}
                  >
                    <option value="">Choose one</option>
                    {question.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
            </div>
          ))}

          <SignatureCanvas
            error={signatureError ?? undefined}
            onChange={(dataUrl) => {
              setSignature(dataUrl)
              if (dataUrl) setSignatureError(null)
            }}
          />

          {error ? <p className="text-body-sm text-error">{error}</p> : null}

          <Button type="submit" fullWidth className="h-14 rounded-full text-headline-sm shadow-[0_8px_20px_-4px_rgba(0,100,124,0.35)]" disabled={submitting}>
            {submitting ? 'Saving…' : 'I agree & sign'}
            <MaterialIcon name="arrow_forward" size={22} />
          </Button>
        </form>
      ) : null}
    </AppLayout>
  )
}
