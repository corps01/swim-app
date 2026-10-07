import { useMemo, useState, type FormEvent } from 'react'
import { KeyRound, User, UserPlus } from 'lucide-react'
import { AppLayout } from '../../components/layout'
import { ChildDetailsStep } from '../../components/enrollment/ChildDetailsStep'
import { StepHeader } from '../../components/enrollment/StepHeader'
import { useAuth } from '../../hooks/useAuth'
import { useEnrollment } from '../../hooks/useEnrollment'
import { useParentSwimmers } from '../../hooks/useParentSwimmers'
import { resolveInstructorInviteCode } from '../../lib/api/enrollment'
import { Button, Card, Input } from '../../components/ui'
import { cn } from '../../lib/cn'
import type { ChildEnrollmentDraft } from '../../types/enrollment'

type EnrollStep = 'child' | 'code' | 'success'

const emptyChild: ChildEnrollmentDraft = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  notes: '',
}

function readInviteCode(): string {
  const fromQuery = new URLSearchParams(window.location.search).get('invite')
  return fromQuery?.trim() ?? ''
}

interface EnrollChildProps {
  onSignOut: () => void
  onFinished: () => void
}

export function EnrollChild({ onSignOut, onFinished }: EnrollChildProps) {
  const { user } = useAuth()
  const { swimmers, loading: swimmersLoading } = useParentSwimmers(user?.id)
  const { submitEnrollment, submitting, error, clearError } = useEnrollment()

  const initialCode = useMemo(() => readInviteCode(), [])
  const [step, setStep] = useState<EnrollStep>('child')
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [newChild, setNewChild] = useState<ChildEnrollmentDraft>(emptyChild)
  const [instructorCode, setInstructorCode] = useState(initialCode)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [successClassLabel, setSuccessClassLabel] = useState('')

  const layoutMeta = useMemo(() => {
    switch (step) {
      case 'child':
        return { title: 'Join a class', subtitle: 'Choose swimmer' }
      case 'code':
        return { title: 'Join a class', subtitle: 'Class code' }
      case 'success':
        return { title: 'Joined class', subtitle: undefined }
    }
  }, [step])

  function resetFlow() {
    setMode('existing')
    setSelectedChildId(null)
    setNewChild(emptyChild)
    setInstructorCode('')
    setCodeError(null)
    setSuccessClassLabel('')
    clearError()
    setStep('child')
  }

  function canContinueFromChild(): boolean {
    if (mode === 'existing') return Boolean(selectedChildId)
    return (
      newChild.firstName.trim() !== '' &&
      newChild.lastName.trim() !== '' &&
      newChild.dateOfBirth !== ''
    )
  }

  async function handleCodeSubmit(event: FormEvent) {
    event.preventDefault()
    setCodeError(null)
    clearError()

    if (!user) return

    try {
      await resolveInstructorInviteCode(instructorCode)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid invite code'
      setCodeError(message)
      return
    }

    const input =
      mode === 'existing' && selectedChildId
        ? {
            parentUserId: user.id,
            instructorCode,
            childId: selectedChildId,
          }
        : {
            parentUserId: user.id,
            instructorCode,
            child: newChild,
          }

    const result = await submitEnrollment(input)
    if (result) {
      setSuccessClassLabel(result.classLabel)
      setStep('success')
    }
  }

  return (
    <AppLayout
      title={layoutMeta.title}
      subtitle={layoutMeta.subtitle}
      onSignOut={step === 'success' ? undefined : onSignOut}
      variant="flow"
    >
      {step === 'child' ? (
        <div className="flex flex-col gap-4">
          <StepHeader
            step={1}
            total={2}
            title="Who is joining?"
            description="Pick a swimmer on your account or add a new one."
          />

          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === 'existing' ? 'primary' : 'secondary'}
              className="flex-1"
              onClick={() => setMode('existing')}
            >
              Existing
            </Button>
            <Button
              type="button"
              variant={mode === 'new' ? 'primary' : 'secondary'}
              className="flex-1"
              onClick={() => setMode('new')}
            >
              <UserPlus className="size-4" aria-hidden />
              New
            </Button>
          </div>

          {mode === 'existing' ? (
            <Card>
              {swimmersLoading ? (
                <p className="text-body-md text-on-surface-variant">Loading swimmers…</p>
              ) : swimmers.length === 0 ? (
                <p className="text-body-md text-on-surface-variant">
                  No swimmers yet. Switch to New to add one, then join with your class code.
                </p>
              ) : (
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
              )}
              <Button
                type="button"
                fullWidth
                className="mt-3"
                disabled={!canContinueFromChild()}
                onClick={() => setStep('code')}
              >
                Continue
              </Button>
            </Card>
          ) : (
            <ChildDetailsStep
              value={newChild}
              onChange={(patch) => setNewChild((current) => ({ ...current, ...patch }))}
              onContinue={() => setStep('code')}
              stepNumber={1}
              stepTotal={2}
              showStepHeader={false}
            />
          )}
        </div>
      ) : null}

      {step === 'code' ? (
        <form onSubmit={handleCodeSubmit} className="flex flex-col gap-4">
          <StepHeader
            step={2}
            total={2}
            title="Enter class code"
            description="Paste the invite code or link your instructor shared."
          />

          <Card>
            <Input
              label="Class invite code"
              hint="Required"
              placeholder="Instructor invite UUID"
              value={instructorCode}
              onChange={(event) => {
                setCodeError(null)
                clearError()
                setInstructorCode(event.target.value)
              }}
              leadingIcon={<KeyRound aria-hidden />}
              error={codeError ?? error ?? undefined}
              required
            />
          </Card>

          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setStep('child')}>
              Back
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? 'Joining…' : 'Join class'}
            </Button>
          </div>
        </form>
      ) : null}

      {step === 'success' ? (
        <div className="flex flex-col gap-4 text-center">
          <h2 className="text-headline-md text-on-surface">Successfully enrolled in class</h2>
          <p className="text-body-md text-on-surface-variant">
            {successClassLabel
              ? `You're enrolled in ${successClassLabel}.`
              : 'Your swimmer is on the instructor roster.'}
          </p>
          <Button fullWidth onClick={onFinished}>Back to home</Button>
          <Button variant="secondary" fullWidth onClick={resetFlow}>
            Join another class
          </Button>
        </div>
      ) : null}
    </AppLayout>
  )
}
