import { useNavigate, useLocation } from 'react-router-dom'
import { LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { clearToken, getUser } from '@/hooks/useAuth'

const breadcrumbMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/sports': 'Sports',
  '/teams': 'Teams',
  '/pitches': 'Pitches',
  '/services': 'Services',
  '/matches': 'Matches',
  '/financials': 'Financials',
  '/settings': 'Settings',
}

export default function Header() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const user = getUser()
  const pageTitle = breadcrumbMap[pathname] ?? 'Admin'

  function handleLogout() {
    clearToken()
    navigate('/login')
  }

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-6 shrink-0">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">{pageTitle}</h2>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">{user?.name ?? user?.email ?? 'Admin'}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="font-normal">
            <div className="text-sm font-medium">{user?.name ?? 'Admin'}</div>
            <div className="text-xs text-muted-foreground">{user?.email}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
