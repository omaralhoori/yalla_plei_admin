import { useState, useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar, { SidebarNav } from './Sidebar'
import Header from './Header'
import { Sheet, SheetContent } from '@/components/ui/sheet'

interface AppLayoutProps {
  children: ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    // Remove any body styles Radix UI may have left when a modal/sheet was
    // open and the user navigated away before closing it.
    document.body.style.removeProperty('overflow')
    document.body.removeAttribute('data-scroll-locked')
    document.body.removeAttribute('data-radix-scroll-area-corner-width')
    document.body.removeAttribute('data-radix-scroll-area-corner-height')
  }, [pathname])

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar — hidden below md */}
      <Sidebar />

      {/* Mobile sidebar Sheet — slides in from the left */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-72 border-0">
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-col flex-1 min-w-0">
        <Header onMenuClick={() => setMobileOpen(true)} />
        {/* key={pathname} forces a full remount on every navigation, which resets
            scroll position and prevents DOM/state bleed-through from the previous page. */}
        <main key={pathname} className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
