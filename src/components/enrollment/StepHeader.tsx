interface StepHeaderProps {
  step: number
  total: number
  title: string
  description: string
}

export function StepHeader({ step, total, title, description }: StepHeaderProps) {
  return (
    <header className="mb-6">
      <p className="text-label-sm uppercase tracking-wider text-primary">
        Step {step} of {total}
      </p>
      <h2 className="mt-1 text-headline-md text-on-surface">{title}</h2>
      <p className="mt-1 text-body-md text-on-surface-variant">{description}</p>
    </header>
  )
}
