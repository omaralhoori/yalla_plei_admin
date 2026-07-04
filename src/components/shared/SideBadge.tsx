import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { BookingSide } from '@/types/api'

const sideStyles: Record<BookingSide, string> = {
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  blue: 'bg-blue-100 text-blue-800 border-blue-300',
}

interface SideBadgeProps {
  side?: BookingSide | null
}

export default function SideBadge({ side }: SideBadgeProps) {
  if (!side) return <span className="text-xs text-muted-foreground">—</span>
  return (
    <Badge variant="outline" className={cn('capitalize font-medium', sideStyles[side])}>
      {side}
    </Badge>
  )
}
