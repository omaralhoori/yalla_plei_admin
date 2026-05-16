import { useNavigate, useLocation } from 'react-router-dom'
import { LogOut, User, Sun, Moon, Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { clearAllTokens, getUser } from '@/hooks/useAuth'
import { useTheme } from '@/contexts/ThemeContext'

const breadcrumbKeys: Record<string, string> = {
  '/dashboard': 'nav.dashboard',
  '/users': 'nav.users',
  '/sports': 'nav.sports',
  '/teams': 'nav.teams',
  '/pitches': 'nav.pitches',
  '/services': 'nav.services',
  '/matches': 'nav.matches',
  '/bookings': 'nav.bookings',
  '/financials': 'nav.financials',
  '/loyalty': 'nav.loyalty',
  '/highlights': 'nav.highlights',
  '/settings': 'nav.settings',
}

export default function Header() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { t, i18n } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const user = getUser()
  const pageTitle = t(breadcrumbKeys[pathname] ?? 'nav.dashboard', { defaultValue: 'Admin' })

  function handleLogout() {
    clearAllTokens()
    navigate('/login')
  }

  function toggleLanguage() {
    i18n.changeLanguage(i18n.language === 'en' ? 'ar' : 'en')
  }

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-6 shrink-0">
      <div>
        <h2 className="text-lg font-semibold">{pageTitle}</h2>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={toggleTheme} title={t(theme === 'dark' ? 'header.lightMode' : 'header.darkMode')}>
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>

        <Button variant="ghost" size="icon" onClick={toggleLanguage} title={t('header.language')}>
          <Languages className="w-4 h-4" />
        </Button>

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
              {t('header.signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
