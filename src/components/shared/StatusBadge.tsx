import { Badge } from '@/components/ui/badge'

const statusConfig = {
  active: { label: 'Active', variant: 'success' as const },
  completed: { label: 'Completed', variant: 'secondary' as const },
  cancelled: { label: 'Cancelled', variant: 'destructive' as const },
  pending: { label: 'Pending', variant: 'warning' as const },
  failed: { label: 'Failed', variant: 'destructive' as const },
  confirmed: { label: 'Confirmed', variant: 'success' as const },
  pending_payment: { label: 'Pending Payment', variant: 'warning' as const },
  pending_approval: { label: 'Pending Approval', variant: 'warning' as const },
  waitlist: { label: 'Waitlist', variant: 'secondary' as const },
  waiting: { label: 'Waiting', variant: 'secondary' as const },
  offered: { label: 'Offered', variant: 'warning' as const },
  accepted: { label: 'Accepted', variant: 'success' as const },
  expired: { label: 'Expired', variant: 'destructive' as const },
  create: { label: 'Create', variant: 'success' as const },
  update: { label: 'Update', variant: 'warning' as const },
  delete: { label: 'Delete', variant: 'destructive' as const },
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
