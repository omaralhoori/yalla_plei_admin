import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet, useRouteError, useNavigate } from 'react-router-dom'
import { isAuthenticated, isAdmin, clearAllTokens } from '@/hooks/useAuth'
import AppLayout from '@/components/layout/AppLayout'

function PageError() {
  const error = useRouteError() as { message?: string }
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-4">
      <p className="text-base font-medium text-destructive">Something went wrong on this page.</p>
      {error?.message && (
        <p className="text-xs text-muted-foreground font-mono max-w-sm">{error.message}</p>
      )}
      <div className="flex gap-3 mt-1">
        <button
          className="text-sm text-primary underline"
          onClick={() => navigate(-1)}
        >
          Go back
        </button>
        <button
          className="text-sm text-primary underline"
          onClick={() => window.location.reload()}
        >
          Refresh
        </button>
      </div>
    </div>
  )
}

const LoginPage = lazy(() => import('@/features/auth/LoginPage'))
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const SportsPage = lazy(() => import('@/features/sports/SportsPage'))
const TeamsPage = lazy(() => import('@/features/sports/TeamsPage'))
const PitchesPage = lazy(() => import('@/features/pitches/PitchesPage'))
const ServicesPage = lazy(() => import('@/features/pitches/ServicesPage'))
const MatchesPage = lazy(() => import('@/features/matches/MatchesPage'))
const MatchTemplatesPage = lazy(() => import('@/features/matches/MatchTemplatesPage'))
const MatchDetailPage = lazy(() => import('@/features/matches/MatchDetailPage'))
const BookingsPage = lazy(() => import('@/features/bookings/BookingsPage'))
const FinancialsPage = lazy(() => import('@/features/financials/FinancialsPage'))
const ReceiptsPage = lazy(() => import('@/features/receipts/ReceiptsPage'))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))
const UsersPage = lazy(() => import('@/features/users/UsersPage'))
const UserDetailPage = lazy(() => import('@/features/users/UserDetailPage'))
const LoyaltyPage = lazy(() => import('@/features/loyalty/LoyaltyPage'))
const HighlightsPage = lazy(() => import('@/features/highlights/HighlightsPage'))
const PromoItemsPage = lazy(() => import('@/features/promo/PromoItemsPage'))
const CountriesPage = lazy(() => import('@/features/locations/CountriesPage'))
const AuditLogsPage = lazy(() => import('@/features/audit/AuditLogsPage'))
const RentalsPage = lazy(() => import('@/features/rentals/RentalsPage'))
const SubscriptionsPage = lazy(() => import('@/features/subscriptions/SubscriptionsPage'))

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
      { path: '/dashboard', element: <DashboardPage />, errorElement: <PageError /> },
      { path: '/users', element: <UsersPage />, errorElement: <PageError /> },
      { path: '/users/:id', element: <UserDetailPage />, errorElement: <PageError /> },
      { path: '/sports', element: <SportsPage />, errorElement: <PageError /> },
      { path: '/teams', element: <TeamsPage />, errorElement: <PageError /> },
      { path: '/pitches', element: <PitchesPage />, errorElement: <PageError /> },
      { path: '/services', element: <ServicesPage />, errorElement: <PageError /> },
      { path: '/matches', element: <MatchesPage />, errorElement: <PageError /> },
      { path: '/match-templates', element: <MatchTemplatesPage />, errorElement: <PageError /> },
      { path: '/matches/:id', element: <MatchDetailPage />, errorElement: <PageError /> },
      { path: '/bookings', element: <BookingsPage />, errorElement: <PageError /> },
      { path: '/financials', element: <FinancialsPage />, errorElement: <PageError /> },
      { path: '/receipts', element: <ReceiptsPage />, errorElement: <PageError /> },
      { path: '/loyalty', element: <LoyaltyPage />, errorElement: <PageError /> },
      { path: '/highlights', element: <HighlightsPage />, errorElement: <PageError /> },
      { path: '/promo-items', element: <PromoItemsPage />, errorElement: <PageError /> },
      { path: '/countries', element: <CountriesPage />, errorElement: <PageError /> },
      { path: '/rentals', element: <RentalsPage />, errorElement: <PageError /> },
      { path: '/subscriptions', element: <SubscriptionsPage />, errorElement: <PageError /> },
      { path: '/audit-logs', element: <AuditLogsPage />, errorElement: <PageError /> },
      { path: '/settings', element: <SettingsPage />, errorElement: <PageError /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
])
