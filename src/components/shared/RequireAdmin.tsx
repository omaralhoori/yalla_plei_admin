import type { ReactNode } from 'react'
import { getUser } from '@/hooks/useAuth'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

export function RequireAdmin({ children, fallback = null }: Props) {
  const user = getUser()
  if (user?.role !== 'admin') return <>{fallback}</>
  return <>{children}</>
}
