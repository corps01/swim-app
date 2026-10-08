import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { User, UserPlus } from 'lucide-react'
import { AppLayout } from '../../components/layout'
import { ClassContextBanner, ClassDetailRows } from '../../components/home/ClassContextBanner'
import { ChildDetailsStep } from '../../components/enrollment/ChildDetailsStep'
import { ClassCodeInput, type ClassCodeInputHandle } from '../../components/enrollment/ClassCodeInput'
import { useAuth } from '../../hooks/useAuth'
import { useEnrollment } from '../../hooks/useEnrollment'
import { useParentSwimmers } from '../../hooks/useParentSwimmers'
import { resolveClassByCode } from '../../lib/api/classes'
import { accentForClass } from '../../lib/classAccent'
import {
  CLASS_CODE_LENGTH,
  CLASS_CODE_NOT_FOUND_MESSAGE,
  clearInviteQueryParam,
  DUPLICATE_CLASS_ENROLLMENT_MESSAGE,
  normalizeClassCodeInput,
  readInviteCodeFromLocation,
} from '../../lib/classCode'
import {
  clearPendingInviteIfMatches,
  clearStoredPendingInviteCode,
  setStoredPendingInviteCode,
} from '../../lib/pendingInvite'
import type { ChildEnrollmentDraft, EnrollChildResult } from '../../types/enrollment'
import type { ResolvedClassInvite } from '../../types/class'
import { Button, Card, MaterialIcon } from '../../components/ui'
import { cn } from '../../lib/cn'

const emptyChild: ChildEnrollmentDraft = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  notes: '',
}

function classJoinSummaryLine(resolved: ResolvedClassInvite): string {
  const schedule = resolved.scheduleDetails?.trim()
  const schedulePart = schedule ? ` (${schedule})` : ''
  return `Joining: ${resolved.className} — Coach ${resolved.instructorName}${schedulePart}`
}

interface EnrollChildProps {
  onSignOut: () => void
  onBack: () => void
  onFinished: () => void
}

export function EnrollChild({ onSignOut, onBack, onFinished }: EnrollChildProps) {
  const { user } = useAuth()
  const { swimmers, loading: swimmersLoading } = useParentSwimmers(user?.id)
  const { submitEnrollment, submitting, error, clearError } = useEnrollment()

  const initialCode = useMemo(() => readInviteCodeFromLocation(), [])
  const deepLinkInviteRef = useRef(initialCode)
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [mode, setMode] = useState<'existing' | 'new'>('new')
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [newChild, setNewChild] = useState<ChildEnrollmentDraft>(emptyChild)
  const [classCode, setClassCode] = useState(initialCode)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [successResult, setSuccessResult] = useState<EnrollChildResult | null>(null)
  const [resolvedClass, setResolvedClass] = useState<ResolvedClassInvite | null>(null)
  const [resolvingClass, setResolvingClass] = useState(false)
  const [showCodeEntry, setShowCodeEntry] = useState(() => initialCode.length !== CLASS_CODE_LENGTH)
  const [inviteLinkHint, setInviteLinkHint] = useState<string | null>(null)
  const classCodeInputRef = useRef<ClassCodeInputHandle>(null)

  useEffect(() => {
    const rawInvite = new URLSearchParams(window.location.search).get('invite')
    if (!rawInvite) return

    const normalized = normalizeClassCodeInput(rawInvite)
    if (normalized.length !== CLASS_CODE_LENGTH) {
      clearInviteQueryParam()
      clearStoredPendingInviteCode()
      deepLinkInviteRef.current = ''
      setClassCode('')
      setShowCodeEntry(true)
      setInviteLinkHint('That invite link was not valid. Enter the class code from your instructor.')
      return
    }

    deepLinkInviteRef.current = normalized
    setClassCode(normalized)
    setStoredPendingInviteCode(normalized)
    setShowCodeEntry(false)
    setInviteLinkHint(null)
  }, [])

  useEffect(() => {
    const childId = new URLSearchParams(window.location.search).get('childId')?.trim()
    if (!childId || swimmersLoading) return
    const exists = swimmers.some((row) => row.id === childId)
    if (!exists) return
    setMode('existing')
    setSelectedChildId(childId)
  }, [swimmers, swimmersLoading])

  const hasSwimmers = swimmers.length > 0
  const isFirstChildFlow = !swimmersLoading && !hasSwimmers
  const normalizedClassCode = normalizeClassCodeInput(classCode)
  const classReady = normalizedClassCode.length === CLASS_CODE_LENGTH && Boolean(resolvedClass)
  const showStudentSection = classReady || (hasSwimmers && !swimmersLoading)

  useEffect(() => {
    if (normalizedClassCode.length !== CLASS_CODE_LENGTH) {
      setResolvedClass(null)
      return
    }

    let cancelled = false
    setResolvingClass(true)
    void (async () => {
      try {
        const result = await resolveClassByCode(normalizedClassCode)
        if (cancelled) return
        setResolvedClass(result)
        if (result) {
          setCodeError(null)
          setInviteLinkHint(null)
          setShowCodeEntry(false)
        } else if (
          deepLinkInviteRef.current &&
          normalizedClassCode === deepLinkInviteRef.current
        ) {
          clearInviteQueryParam()
          clearPendingInviteIfMatches(normalizedClassCode)
          deepLinkInviteRef.current = ''
          setClassCode('')
          setResolvedClass(null)
          setShowCodeEntry(true)
          setCodeError(null)
          setInviteLinkHint(
            'That invite link is no longer valid. Enter the class code from your instructor.',
          )
        } else {
          clearPendingInviteIfMatches(normalizedClassCode)
          setCodeError(CLASS_CODE_NOT_FOUND_MESSAGE)
        }
      } catch {
        if (cancelled) return
        if (
          deepLinkInviteRef.current &&
          normalizedClassCode === deepLinkInviteRef.current
        ) {
          clearInviteQueryParam()
          clearPendingInviteIfMatches(normalizedClassCode)
          deepLinkInviteRef.current = ''
          setClassCode('')
          setResolvedClass(null)
          setShowCodeEntry(true)
          setCodeError(null)
          setInviteLinkHint(
            'That invite link is no longer valid. Enter the class code from your instructor.',
          )
        } else {
          clearPendingInviteIfMatches(normalizedClassCode)
          setResolvedClass(null)
          setCodeError(CLASS_CODE_NOT_FOUND_MESSAGE)
        }
      } finally {
        if (!cancelled) setResolvingClass(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [normalizedClassCode])

  useEffect(() => {
    if (swimmersLoading) return
    if (!hasSwimmers) {
      setMode('new')
      setSelectedChildId(null)
    }
  }, [swimmersLoading, hasSwimmers])

  function resetFlow() {
    setMode(hasSwimmers ? 'existing' : 'new')
    setSelectedChildId(null)
    setNewChild(emptyChild)
    const invite = readInviteCodeFromLocation()
    deepLinkInviteRef.current = invite
    setClassCode(invite)
    setResolvedClass(null)
    setShowCodeEntry(invite.length !== CLASS_CODE_LENGTH)
    setInviteLinkHint(null)
    setCodeError(null)
    setFormError(null)
    setSuccessResult(null)
    clearError()
    setStep('form')
  }

  function handleExit() {
    clearStoredPendingInviteCode()
    clearInviteQueryParam()
    onBack()
  }

  function handleChangeClass() {
    clearInviteQueryParam()
    clearStoredPendingInviteCode()
    deepLinkInviteRef.current = ''
    setShowCodeEntry(true)
    setResolvedClass(null)
    setClassCode('')
    setInviteLinkHint(null)
    setCodeError(null)
    setFormError(null)
    clearError()
  }

  function childIsValid(): boolean {
    if (mode === 'existing') return Boolean(selectedChildId)
    return (
      newChild.firstName.trim() !== '' &&
      newChild.lastName.trim() !== '' &&
      newChild.dateOfBirth !== ''
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setCodeError(null)
    setFormError(null)
    clearError()

    if (!user) return

    if (!childIsValid()) {
      return
    }

    const normalizedCode = classCodeInputRef.current?.flushNormalization() ?? normalizeClassCodeInput(classCode)
    setClassCode(normalizedCode)
    if (normalizedCode.length !== CLASS_CODE_LENGTH) {
      setCodeError(CLASS_CODE_NOT_FOUND_MESSAGE)
      return
    }

    const input =
      mode === 'existing' && selectedChildId
        ? {
            parentUserId: user.id,
            classCode: normalizedCode,
            childId: selectedChildId,
          }
        : {
            parentUserId: user.id,
            classCode: normalizedCode,
            child: newChild,
          }

    const outcome = await submitEnrollment(input)
    if ('result' in outcome) {
      setSuccessResult(outcome.result)
      setStep('success')
      return
    }

    const message = outcome.error
    if (message === DUPLICATE_CLASS_ENROLLMENT_MESSAGE) {
      setFormError(message)
      return
    }
    if (
      message === CLASS_CODE_NOT_FOUND_MESSAGE ||
      message.toLowerCase().includes('class code') ||
      message.toLowerCase().includes('not found')
    ) {
      setCodeError(CLASS_CODE_NOT_FOUND_MESSAGE)
    }
  }

  const displayError = codeError

  const selectedSwimmer = swimmers.find((swimmer) => swimmer.id === selectedChildId)

  const childDisplayName = useMemo(() => {
    if (mode === 'existing' && selectedSwimmer) {
      return `${selectedSwimmer.firstName} ${selectedSwimmer.lastName}`.trim()
    }
    const first = newChild.firstName.trim()
    const last = newChild.lastName.trim()
    if (!first) return null
    return last ? `${first} ${last}` : first
  }, [mode, selectedSwimmer, newChild.firstName, newChild.lastName])

  const submitButtonLabel = useMemo(() => {
    if (submitting) {
      return isFirstChildFlow ? 'Adding & joining…' : 'Enrolling…'
    }
    if (isFirstChildFlow && classReady) {
      return 'Add Child & Join Class'
    }
    const className = resolvedClass?.className
    if (childDisplayName && className) {
      return `Enroll ${childDisplayName} in ${className}`
    }
    if (className) return `Enroll in ${className}`
    return 'Join class'
  }, [submitting, isFirstChildFlow, classReady, childDisplayName, resolvedClass?.className])

  const formTitle =
    step === 'success'
      ? 'Joined class'
      : isFirstChildFlow && !classReady
        ? 'Enter class code'
        : isFirstChildFlow && classReady
          ? 'Add your swimmer'
          : 'Enroll child'

  const formSubtitle =
    step === 'success'
      ? undefined
      : isFirstChildFlow && !classReady
        ? 'Start with the code or link your instructor shared.'
        : isFirstChildFlow && classReady
          ? 'Confirm your child’s details to finish enrolling.'
          : resolvedClass
            ? `Join ${resolvedClass.className}`
            : 'Choose a class, then add your swimmer'

  return (
    <AppLayout
      title={formTitle}
      subtitle={formSubtitle}
      onBack={step === 'success' ? undefined : handleExit}
      onSignOut={step === 'success' ? undefined : onSignOut}
      variant="flow"
    >
      {step === 'form' ? (
        <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
          {resolvedClass && !showCodeEntry && !resolvingClass ? (
            <button
              type="button"
              className="-mb-1 flex items-center gap-1 self-start text-body-sm font-semibold text-primary"
              onClick={handleChangeClass}
            >
              <MaterialIcon name="arrow_back" size={18} />
              Enter a different code
            </button>
          ) : null}

          {resolvingClass ? (
            <p className="text-body-md text-on-surface-variant">Looking up class…</p>
          ) : resolvedClass && !showCodeEntry ? (
            <ClassContextBanner
              accent={accentForClass(resolvedClass.classId)}
              title={classJoinSummaryLine(resolvedClass)}
              pill="Class confirmed"
            >
              <ClassDetailRows
                accent={accentForClass(resolvedClass.classId)}
                schedule={
                  resolvedClass.scheduleDetails || 'Ask your instructor for session times'
                }
                location={resolvedClass.location || 'Ask your instructor for the pool location'}
                instructor={resolvedClass.instructorName}
              />
            </ClassContextBanner>
          ) : (
            <div className="flex flex-col gap-2">
              {isFirstChildFlow ? (
                <div className="mb-1">
                  <h2 className="text-headline-sm text-on-surface">Enter your class code</h2>
                  <p className="mt-1 text-body-sm text-on-surface-variant">
                    Your instructor shares a 6-character code or invite link. We&apos;ll show the
                    class details next.
                  </p>
                </div>
              ) : null}
              {inviteLinkHint ? (
                <p className="text-body-sm text-on-surface-variant" role="status">
                  {inviteLinkHint}
                </p>
              ) : null}
              <Card>
                <ClassCodeInput
                  ref={classCodeInputRef}
                  value={classCode}
                  onChange={(next) => {
                    setCodeError(null)
                    setInviteLinkHint(null)
                    setFormError(null)
                    clearError()
                    setClassCode(next)
                    setShowCodeEntry(true)
                    if (normalizeClassCodeInput(next) !== deepLinkInviteRef.current) {
                      deepLinkInviteRef.current = ''
                    }
                  }}
                  error={displayError ?? undefined}
                  disabled={submitting}
                />
              </Card>
            </div>
          )}

          {swimmersLoading ? (
            <p className="text-body-md text-on-surface-variant">Loading swimmers…</p>
          ) : null}

          {isFirstChildFlow && classReady ? (
            <header className="flex flex-col gap-1">
              <h2 className="text-headline-md text-on-surface">Who will be taking this class?</h2>
              <p className="text-body-sm text-on-surface-variant">
                You haven&apos;t added a swimmer yet. Enter your child&apos;s info below to finish
                enrolling.
              </p>
            </header>
          ) : null}

          {showStudentSection && hasSwimmers ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === 'existing' ? 'primary' : 'secondary'}
                className="flex-1"
                onClick={() => setMode('existing')}
              >
                Existing swimmer
              </Button>
              <Button
                type="button"
                variant={mode === 'new' ? 'primary' : 'secondary'}
                className="flex-1"
                onClick={() => setMode('new')}
              >
                <UserPlus className="size-4" aria-hidden />
                New swimmer
              </Button>
            </div>
          ) : null}

          {showStudentSection && hasSwimmers && mode === 'existing' ? (
            <Card>
              <ul className="flex flex-col gap-2">
                {swimmers.map((swimmer) => {
                  const selected = selectedChildId === swimmer.id
                  return (
                    <li key={swimmer.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedChildId(swimmer.id)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                          selected
                            ? 'border-primary bg-primary/5'
                            : 'border-outline-variant bg-surface-container-low',
                        )}
                      >
                        <span
                          className={cn(
                            'flex size-10 items-center justify-center rounded-full',
                            selected ? 'bg-primary text-on-primary' : 'bg-surface-container-high',
                          )}
                        >
                          <User className="size-5" aria-hidden />
                        </span>
                        <span>
                          <span className="block text-label-lg text-on-surface">
                            {swimmer.firstName} {swimmer.lastName}
                          </span>
                          <span className="text-body-sm text-on-surface-variant">
                            DOB {swimmer.dateOfBirth}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </Card>
          ) : showStudentSection && !swimmersLoading && (classReady || !isFirstChildFlow) ? (
            <ChildDetailsStep
              value={newChild}
              onChange={(patch) => setNewChild((current) => ({ ...current, ...patch }))}
              onContinue={() => undefined}
              hideActions
              showStepHeader={false}
            />
          ) : null}

          {formError ? (
            <p className="text-body-sm text-error" role="alert">{formError}</p>
          ) : null}
          {error && !codeError && !formError ? (
            <p className="text-body-sm text-error" role="alert">{error}</p>
          ) : null}

          {showStudentSection ? (
            <Button
              type="submit"
              fullWidth
              disabled={submitting || !childIsValid() || !classReady}
            >
              {submitButtonLabel}
            </Button>
          ) : null}
        </form>
      ) : null}

      {step === 'success' && successResult ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-3xl border border-secondary/30 bg-secondary-container/30 p-6 text-center">
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-secondary text-on-secondary">
              <MaterialIcon name="check_circle" size={32} filled />
            </div>
            <h2 className="text-headline-md text-on-surface">You&apos;re in!</h2>
            <p className="mt-1 text-body-md text-on-surface-variant">
              {successResult.classLabel}
            </p>
            <p className="mt-2 text-body-sm text-on-surface-variant">
              Class times and location are on your home screen.
            </p>
          </div>

          <Card className="divide-y divide-outline-variant/20 p-0 overflow-hidden">
            <dl className="flex flex-col">
              <div className="flex gap-3 px-4 py-3">
                <MaterialIcon name="person" size={20} className="mt-0.5 text-primary" />
                <div>
                  <dt className="text-label-sm text-on-surface-variant">Instructor</dt>
                  <dd className="text-body-md font-medium text-on-surface">{successResult.instructorName}</dd>
                </div>
              </div>
              <div className="flex gap-3 px-4 py-3">
                <MaterialIcon name="schedule" size={20} className="mt-0.5 text-primary" />
                <div>
                  <dt className="text-label-sm text-on-surface-variant">Schedule</dt>
                  <dd className="text-body-md font-medium text-on-surface">
                    {successResult.scheduleDetails || 'Ask your instructor for session times'}
                  </dd>
                </div>
              </div>
              <div className="flex gap-3 px-4 py-3">
                <MaterialIcon name="location_on" size={20} className="mt-0.5 text-primary" />
                <div>
                  <dt className="text-label-sm text-on-surface-variant">Pool location</dt>
                  <dd className="text-body-md font-medium text-on-surface">
                    {successResult.location || 'Ask your instructor for the pool location'}
                  </dd>
                </div>
              </div>
            </dl>
          </Card>

          <Button fullWidth onClick={onFinished}>Back to home</Button>
          <Button variant="secondary" fullWidth onClick={resetFlow}>
            Enroll another child
          </Button>
        </div>
      ) : null}
    </AppLayout>
  )
}
