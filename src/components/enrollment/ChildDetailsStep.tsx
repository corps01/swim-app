import { type FormEvent } from 'react'
import { Calendar, User } from 'lucide-react'
import { Button, Card, Input } from '../ui'
import { cn } from '../../lib/cn'
import { controlClass } from '../ui/styles'
import type { ChildEnrollmentDraft } from '../../types/enrollment'
import { StepHeader } from './StepHeader'

interface ChildDetailsStepProps {
  value: ChildEnrollmentDraft
  onChange: (patch: Partial<ChildEnrollmentDraft>) => void
  onContinue: () => void
}

export function ChildDetailsStep({ value, onChange, onContinue }: ChildDetailsStepProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onContinue()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <StepHeader
        step={1}
        total={3}
        title="Swimmer profile"
        description="Tell us about the child you are enrolling."
      />

      <Card>
        <Input
          label="First name"
          hint="Required"
          autoComplete="given-name"
          value={value.firstName}
          onChange={(event) => onChange({ firstName: event.target.value })}
          leadingIcon={<User aria-hidden />}
          required
        />

        <Input
          label="Last name"
          hint="Required"
          autoComplete="family-name"
          value={value.lastName}
          onChange={(event) => onChange({ lastName: event.target.value })}
          leadingIcon={<User aria-hidden />}
          required
        />

        <Input
          label="Date of birth"
          hint="Required"
          type="date"
          value={value.dateOfBirth}
          onChange={(event) => onChange({ dateOfBirth: event.target.value })}
          leadingIcon={<Calendar aria-hidden />}
          required
        />

        <label className="flex flex-col gap-1.5">
          <span className="text-label-md text-on-surface">Notes</span>
          <textarea
            rows={3}
            placeholder="Allergies, comfort level in water, or other notes"
            value={value.notes}
            onChange={(event) => onChange({ notes: event.target.value })}
            className={cn(controlClass, 'h-auto min-h-[96px] resize-y py-3')}
          />
        </label>

        <Button type="submit" fullWidth className="mt-1">
          Continue
        </Button>
      </Card>
    </form>
  )
}
