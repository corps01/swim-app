import { useEffect, useMemo, useState } from 'react'
import { AppLayout } from '../components/layout'
import { ChildDetailsStep } from '../components/enrollment/ChildDetailsStep'
import { EnrollmentConfirmStep } from '../components/enrollment/EnrollmentConfirmStep'
import { EnrollmentSuccessStep } from '../components/enrollment/EnrollmentSuccessStep'
import { InstructorLinkStep } from '../components/enrollment/InstructorLinkStep'
import { useAuth } from '../hooks/useAuth'
import { useEnrollment } from '../hooks/useEnrollment'
import { lookupInstructorByCode, type InstructorOption } from '../lib/api/instructors'
import type { ChildEnrollmentDraft } from '../types/enrollment'

type EnrollmentStep = 'child' | 'instructor' | 'confirm' | 'success'

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

interface ParentEnrollmentPageProps {
  onSignOut: () => void
  onFinished: () => void
}

export function ParentEnrollmentPage({ onSignOut, onFinished }: ParentEnrollmentPageProps) {
  const { user } = useAuth()
  const { submitEnrollment, submitting, error, clearError } = useEnrollment()
  const initialCode = useMemo(() => readInviteCode(), [])
  const [step, setStep] = useState<EnrollmentStep>('child')
  const [child, setChild] = useState<ChildEnrollmentDraft>(emptyChild)
  const [instructorCode, setInstructorCode] = useState(initialCode)
  const [instructor, setInstructor] = useState<InstructorOption | null>(null)

  useEffect(() => {
    if (!initialCode) return
    void lookupInstructorByCode(initialCode).then((match) => {
      if (match) setInstructor(match)
    })
  }, [initialCode])

  const layoutMeta = useMemo(() => {
    switch (step) {
      case 'child':
        return { title: 'Enroll a swimmer', subtitle: 'Child profile' }
      case 'instructor':
        return { title: 'Enroll a swimmer', subtitle: 'Instructor link' }
      case 'confirm':
        return { title: 'Enroll a swimmer', subtitle: 'Review' }
      case 'success':
        return { title: 'Enrollment complete', subtitle: undefined }
    }
  }, [step])

  function resetFlow() {
    setChild(emptyChild)
    setInstructorCode('')
    setInstructor(null)
    clearError()
    setStep('child')
  }

  async function handleConfirm() {
    if (!instructor || !user) return

    const result = await submitEnrollment({
      parentUserId: user.id,
      child,
      instructorCode: instructor.code,
    })

    if (result) {
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
        <ChildDetailsStep
          value={child}
          onChange={(patch) => setChild((current) => ({ ...current, ...patch }))}
          onContinue={() => setStep('instructor')}
        />
      ) : null}

      {step === 'instructor' ? (
        <InstructorLinkStep
          code={instructorCode}
          onCodeChange={setInstructorCode}
          onSelect={setInstructor}
          onBack={() => setStep('child')}
          onContinue={() => setStep('confirm')}
        />
      ) : null}

      {step === 'confirm' && instructor ? (
        <EnrollmentConfirmStep
          child={child}
          instructor={instructor}
          submitting={submitting}
          error={error}
          onBack={() => setStep('instructor')}
          onSubmit={handleConfirm}
        />
      ) : null}

      {step === 'success' && instructor ? (
        <EnrollmentSuccessStep
          child={child}
          instructor={instructor}
          onEnrollAnother={resetFlow}
          onGoHome={onFinished}
        />
      ) : null}
    </AppLayout>
  )
}
