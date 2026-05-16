import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { isAuthenticated, isAdmin, clearAllTokens } from '@/hooks/useAuth'
import AppLayout from '@/components/layout/AppLayout'

const LoginPage = lazy(() => import('@/features/auth/LoginPage'))
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const SportsPage = lazy(() => import('@/features/sports/SportsPage'))
const TeamsPage = lazy(() => import('@/features/sports/TeamsPage'))
const PitchesPage = lazy(() => import('@/features/pitches/PitchesPage'))
const ServicesPage = lazy(() => import('@/features/pitches/ServicesPage'))
const MatchesPage = lazy(() => import('@/features/matches/MatchesPage'))
const MatchDetailPage = lazy(() => import('@/features/matches/MatchDetailPage'))
const BookingsPage = lazy(() => import('@/features/bookings/BookingsPage'))
const FinancialsPage = lazy(() => import('@/features/financials/FinancialsPage'))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))
const UsersPage = lazy(() => import('@/features/users/UsersPage'))
const UserDetailPage = lazy(() => import('@/features/users/UserDetailPage'))
const LoyaltyPage = lazy(() => import('@/features/loyalty/LoyaltyPage'))
const HighlightsPage = lazy(() => import('@/features/highlights/HighlightsPage'))

function ProtectedRoute() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  if (!isAdmin()) {
    clearAllTokens()
    return <Navigate to="/login" replace />
  }
  return (
    <AppLayout>
      <Suspense fallback={<div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>}>
        <Outlet />
      </Suspense>
    </AppLayout>
  )
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Suspense fallback={null}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/users', element: <UsersPage /> },
      { path: '/users/:id', element: <UserDetailPage /> },
      { path: '/sports', element: <SportsPage /> },
      { path: '/teams', element: <TeamsPage /> },
      { path: '/pitches', element: <PitchesPage /> },
      { path: '/services', element: <ServicesPage /> },
      { path: '/matches', element: <MatchesPage /> },
      { path: '/matches/:id', element: <MatchDetailPage /> },
      { path: '/bookings', element: <BookingsPage /> },
      { path: '/financials', element: <FinancialsPage /> },
      { path: '/loyalty', element: <LoyaltyPage /> },
      { path: '/highlights', element: <HighlightsPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
])
