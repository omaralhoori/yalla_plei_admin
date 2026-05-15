import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Dumbbell, Users, MapPin, Wrench,
  Calendar, CreditCard, Settings, Trophy,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/sports', icon: Dumbbell, label: 'Sports' },
  { to: '/teams', icon: Trophy, label: 'Teams' },
  { to: '/pitches', icon: MapPin, label: 'Pitches' },
  { to: '/services', icon: Wrench, label: 'Services' },
  { to: '/matches', icon: Calendar, label: 'Matches' },
  { to: '/financials', icon: CreditCard, label: 'Financials' },
  { to: '/settings', icon: Settings, label: 'Settings' },
] as const

export default function Sidebar() {
  return (
    <aside className="flex flex-col w-64 min-h-screen bg-slate-900 text-slate-100 shrink-0">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Users className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-lg tracking-tight">Yalla Plei</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
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
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-4 border-t border-slate-700 text-xs text-slate-500">
        Admin Panel v1.0
      </div>
    </aside>
  )
}
