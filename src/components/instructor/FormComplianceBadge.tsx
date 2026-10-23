import { Badge } from '../ui'

interface FormComplianceBadgeProps {
  status: 'signed' | 'pending'
  swimmerName: string
  onOpen?: () => void
  label?: string
}

export function FormComplianceBadge({ status, swimmerName, onOpen, label }: FormComplianceBadgeProps) {
  const signed = status === 'signed'
  return (
    <Badge
      tone={signed ? 'success' : 'warning'}
      onClick={onOpen}
      aria-label={signed ? `View signed form for ${swimmerName}` : `Open pending form for ${swimmerName}`}
    >
      {label ?? (signed ? 'Form Signed' : 'Form Pending')}
    </Badge>
  )
}
