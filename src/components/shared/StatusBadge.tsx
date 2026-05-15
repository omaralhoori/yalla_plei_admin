import { Badge } from '@/components/ui/badge'

const statusConfig = {
  active: { label: 'Active', variant: 'success' as const },
  completed: { label: 'Completed', variant: 'secondary' as const },
  cancelled: { label: 'Cancelled', variant: 'destructive' as const },
  pending: { label: 'Pending', variant: 'warning' as const },
  failed: { label: 'Failed', variant: 'destructive' as const },
  confirmed: { label: 'Confirmed', variant: 'success' as const },
  true: { label: 'Yes', variant: 'success' as const },
  false: { label: 'No', variant: 'secondary' as const },
} as const

type StatusKey = keyof typeof statusConfig

interface StatusBadgeProps {
  status: string
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status as StatusKey] ?? { label: status, variant: 'outline' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
