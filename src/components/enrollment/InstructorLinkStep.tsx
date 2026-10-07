import { useState, type FormEvent } from 'react'
import { KeyRound } from 'lucide-react'
import { lookupInstructorByCode, type InstructorOption } from '../../lib/api/instructors'
import { Button, Card, Input } from '../ui'
import { StepHeader } from './StepHeader'

interface InstructorLinkStepProps {
  code: string
  onCodeChange: (code: string) => void
  onSelect: (instructor: InstructorOption) => void
  onBack: () => void
  onContinue: () => void
}

export function InstructorLinkStep({
  code,
  onCodeChange,
  onSelect,
  onBack,
  onContinue,
}: InstructorLinkStepProps) {
  const [codeError, setCodeError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setCodeError(null)
    setChecking(true)

    try {
      const match = await lookupInstructorByCode(code)
      if (!match) {
        setCodeError(
          'Instructor not found. Paste the invite ID (UUID) your instructor shared with you.',
        )
        return
      }
      onSelect(match)
      onContinue()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not verify the instructor invite.'
      setCodeError(message)
    } finally {
      setChecking(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <StepHeader
        step={2}
        total={3}
        title="Link to a class"
        description="Paste the instructor invite ID from your coach."
      />

      <Card>
        <Input
          label="Instructor invite ID"
          hint="Required"
          placeholder="e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6"
          value={code}
          onChange={(event) => {
            setCodeError(null)
            onCodeChange(event.target.value)
          }}
          leadingIcon={<KeyRound aria-hidden />}
          error={codeError ?? undefined}
          required
        />
      </Card>

      <div className="flex gap-3">
        <Button type="button" variant="secondary" className="flex-1" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" className="flex-1" disabled={checking}>
          {checking ? 'Checking…' : 'Continue'}
        </Button>
      </div>
    </form>
  )
}
