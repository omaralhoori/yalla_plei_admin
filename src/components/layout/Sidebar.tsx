import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, Dumbbell, Users, MapPin, Wrench,
  Calendar, CalendarCog, CreditCard, Receipt, Settings, Trophy, Gift, BookOpen, Film, Globe, History, KeyRound, Crown, Megaphone,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { to: '/users', icon: Users, labelKey: 'nav.users' },
  { to: '/sports', icon: Dumbbell, labelKey: 'nav.sports' },
  { to: '/teams', icon: Trophy, labelKey: 'nav.teams' },
  { to: '/pitches', icon: MapPin, labelKey: 'nav.pitches' },
  { to: '/services', icon: Wrench, labelKey: 'nav.services' },
  { to: '/countries', icon: Globe, labelKey: 'nav.countries' },
  { to: '/matches', icon: Calendar, labelKey: 'nav.matches' },
  { to: '/match-templates', icon: CalendarCog, labelKey: 'nav.matchTemplates' },
  { to: '/bookings', icon: BookOpen, labelKey: 'nav.bookings' },
  { to: '/rentals', icon: KeyRound, labelKey: 'nav.rentals' },
  { to: '/financials', icon: CreditCard, labelKey: 'nav.financials' },
  { to: '/receipts', icon: Receipt, labelKey: 'nav.receipts' },
  { to: '/loyalty', icon: Gift, labelKey: 'nav.loyalty' },
  { to: '/subscriptions', icon: Crown, labelKey: 'nav.subscriptions' },
  { to: '/highlights', icon: Film, labelKey: 'nav.highlights' },
  { to: '/promo-items', icon: Megaphone, labelKey: 'nav.promoItems' },
  { to: '/audit-logs', icon: History, labelKey: 'nav.auditLogs' },
  { to: '/settings', icon: Settings, labelKey: 'nav.settings' },
] as const

interface SidebarNavProps {
  onNavigate?: () => void
}

// Shared nav content — used by both the desktop aside and the mobile Sheet.
export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Users className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-lg tracking-tight">Yalla Plei</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, labelKey }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-4 border-t border-slate-700 text-xs text-slate-500 shrink-0">
        Admin Panel v1.0
      </div>
    </div>
  )
}

// Desktop-only sidebar wrapper — hidden on mobile, shown on md+.
export default function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen shrink-0">
      <SidebarNav />
    </aside>
  )
}
