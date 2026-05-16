# Yalla Plei Admin Dashboard — Project Summary

> **Stack**: React 18 + Vite + TypeScript (strict) · Tailwind CSS + Shadcn UI · React Router v6 · TanStack Query v5 · React Hook Form + Zod · Recharts · Axios · react-i18next  
> **API Base**: `https://api.yallaplei.com/api/v1`  
> **Build**: `npm run build` → `dist/`  
> **Docker**: `docker build --build-arg VITE_API_BASE_URL=<url> -t yalla-plei-admin .`

---

## Global Standards

### Currency
All monetary values are displayed in **Jordanian Dinar (JOD / دينار أردني)** using the `formatCurrency(amount)` utility from `src/lib/utils.ts`. Format: `15.00 JOD`.

### Timezone
- **Display**: All UTC timestamps from the API are automatically converted to the user's **browser local timezone** via `formatDate()` and `formatDateTime()` (use the native `Date` object which applies local TZ automatically).
- **Submission**: Form date/time inputs (local timezone) are converted back to **UTC ISO strings** before sending to the API via `localDateTimeToUtc(date, time)`.
- Additional helpers: `utcToLocalDate(utcStr)`, `utcToLocalTime(utcStr)` — used in match edit forms to pre-populate date/time fields from UTC API values.

---

## Folder Structure

```
yalla-plei-admin/
├── public/
├── src/
│   ├── components/
│   │   ├── ui/                     # Shadcn UI primitives (Button, Input, Card, Table, Textarea…)
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx       # Shell: sidebar + header + main
│   │   │   ├── Sidebar.tsx         # Nav links with i18n labels + active state
│   │   │   └── Header.tsx          # Breadcrumb + dark mode toggle + language toggle + user dropdown
│   │   └── shared/
│   │       ├── DataTable.tsx       # Generic paginated table + optional CSV export
│   │       ├── ConfirmDialog.tsx   # Destructive action confirmation modal (ReactNode description)
│   │       ├── ImageUpload.tsx     # Upload → POST /uploads → URL
│   │       ├── PageHeader.tsx      # Title + subtitle + action slot
│   │       ├── StatusBadge.tsx     # Colored status pill
│   │       └── RequireAdmin.tsx    # Role-gate wrapper (admin-only content)
│   ├── contexts/
│   │   └── ThemeContext.tsx        # Dark mode context + localStorage + document.documentElement.classList
│   ├── features/
│   │   ├── auth/
│   │   │   └── LoginPage.tsx       # Email/password login with JWT pair storage
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx   # Reports summary + Recharts visualizations
│   │   ├── users/
│   │   │   ├── UsersPage.tsx       # Paginated user list with search/role filter + create admin modal
│   │   │   └── UserDetailPage.tsx  # User stats, wallet balance, player profiles, bookings, adjust-points
│   │   ├── sports/
│   │   │   ├── SportsPage.tsx      # Sports CRUD with image upload + toggles
│   │   │   └── TeamsPage.tsx       # Teams CRUD with logo upload + pagination
│   │   ├── pitches/
│   │   │   ├── PitchesPage.tsx     # Pitches CRUD + search bar + surface_type filter
│   │   │   └── ServicesPage.tsx    # Pitch amenities CRUD
│   │   ├── matches/
│   │   │   └── MatchesPage.tsx     # Match scheduling via /admin/matches + date/pitch/status filters + pitch services override
│   │   ├── bookings/
│   │   │   └── BookingsPage.tsx    # Admin view of all bookings + status/match_id filters + Force Cancel with refund toggle
│   │   ├── financials/
│   │   │   └── FinancialsPage.tsx  # Transaction table + user_id URL param pre-filter + manual refund + CSV export
│   │   ├── loyalty/
│   │   │   └── LoyaltyPage.tsx     # Tabbed: Levels CRUD (with 409 overlap handling) + Rewards CRUD (with ImageUpload)
│   │   ├── highlights/
│   │   │   └── HighlightsPage.tsx  # Highlights CRUD with media URL + thumbnail ImageUpload + show period
│   │   └── settings/
│   │       └── SettingsPage.tsx    # Tabbed: Cancellation Policies CRUD + extensible placeholder tabs
│   ├── hooks/
│   │   ├── useAuth.ts              # JWT decode, token helpers (access + refresh), role check
│   │   ├── usePagination.ts        # offset/limit pagination state
│   │   └── use-toast.ts            # Toast notification hook
│   ├── i18n/
│   │   ├── index.ts                # react-i18next init + dir/lang attribute sync
│   │   └── locales/
│   │       ├── en.json             # English translations
│   │       └── ar.json             # Arabic translations
│   ├── lib/
│   │   ├── api.ts                  # Axios instance + refresh-token queue-mutex interceptor
│   │   ├── queryClient.ts          # TanStack Query client config
│   │   └── utils.ts                # cn(), formatCurrency() [JOD], formatDate/Time(), timezone helpers
│   ├── router/
│   │   └── index.tsx               # Routes + ProtectedRoute guard (clearAllTokens on auth failure)
│   ├── types/
│   │   └── api.ts                  # All TypeScript API types and interfaces
│   ├── App.tsx                     # ThemeProvider + QueryClientProvider + RouterProvider + Toaster
│   ├── main.tsx                    # React root mount
│   ├── index.css                   # Tailwind directives + CSS variables (light + dark)
│   └── vite-env.d.ts               # Vite env type augmentation
├── nginx.conf                      # SPA fallback + gzip + security headers
├── Dockerfile                      # Multi-stage: Node build → nginx serve
├── .dockerignore
├── .env.example                    # VITE_API_BASE_URL template
├── components.json                 # Shadcn UI config
├── tailwind.config.js              # darkMode: ['class']
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── vite.config.ts
└── package.json
```

---

## Implemented Features

### Security & Auth
- [x] Axios instance with automatic `Authorization: Bearer <token>` injection
- [x] **Refresh token flow** — queue-mutex pattern: on 401, calls `POST /auth/refresh`, retries original request(s); concurrent 401s are queued and retried with the new token; force-logout on refresh failure
- [x] Token pair: `access_token` (localStorage `yp_admin_token`) + `refresh_token` (localStorage `yp_admin_refresh_token`)
- [x] `clearAllTokens()` — removes both tokens atomically on logout / auth failure
- [x] JWT payload decoder (no external dependency) — extracts `role`, `name`, `email`
- [x] `ProtectedRoute` — guards all admin pages; bounces non-admin roles to login
- [x] Token expiry check via `exp` claim

### Pages & Modules
- [x] **Login** — Email/password form, Zod validation, inline error handling, show/hide password; stores `access_token` + `refresh_token`
- [x] **Dashboard** — Date range filter, 4 stat cards, AreaChart + BarChart + PieChart via Recharts
- [x] **Users (CRM)** — Paginated user list, search by name/email/phone, role filter, "View" drill-down, create admin/manager modal
- [x] **User Detail** — Aggregate stats (points, wallet balance, matches, goals, assists, MVPs), player profiles per sport with level, adjust loyalty points dialog, recent bookings section, "View Transactions" link
- [x] **Sports** — Full CRUD (list, create, edit, delete) with image upload and enable/available toggles
- [x] **Teams** — Full CRUD with paginated list and logo upload
- [x] **Pitches** — Full CRUD + **search bar** + **surface_type dropdown filter** + service assignment
- [x] **Services** — Full CRUD for pitch amenities
- [x] **Matches** — Uses `/admin/matches` (all statuses) + **date-range pickers** + **pitch filter** + **status filter** + per-match services checklist pre-populated from pitch defaults (local ↔ UTC timezone conversion); correct UTC date/time payload format (`YYYY-MM-DD` + `HH:MM:SS`); sport→pitch dependent dropdown
- [x] **Match Detail** (`/matches/:id`) — Match info card (date/time local, pitch, sport, format, price, policy, status), capacity stats (booked/available/total slots), registered players table from `/admin/bookings?match_id`, "Add Highlight" button opens pre-filled highlight Sheet with match_id hidden
- [x] **Bookings** — Paginated admin view (`GET /admin/bookings`), status + match_id filters, Force Cancel with refund toggle (`POST /admin/bookings/:id/cancel`)
- [x] **Financials** — Filterable transactions (status/source/user_id/date range), user_id pre-filter via URL query param, manual refund with 2-step confirmation (JOD currency), CSV export
- [x] **Loyalty** — Tabbed: Levels CRUD (409 overlap error shown inline) + Rewards CRUD (image upload, required points)
- [x] **Highlights** — Full CRUD (`/admin/highlights`): media URL + thumbnail ImageUpload + show period; `match_id` uses searchable **MatchCombobox** (filters by pitch/date/sport client-side) instead of raw UUID input
- [x] **Settings** — Tabbed layout with full cancellation policy CRUD; extensible placeholder tabs

### Shared Components
- [x] `DataTable<T>` — generic typed table with skeleton loading, pagination, and optional **CSV export** (per-column `csvValue` function)
- [x] `ConfirmDialog` — reusable confirmation modal; `description` accepts `ReactNode` (supports custom UI like refund toggle)
- [x] `ImageUpload` — file picker → multipart POST → URL preview
- [x] `PageHeader` — consistent page title + action slot pattern
- [x] `StatusBadge` — mapped color badges for all status values
- [x] `RequireAdmin` — renders children only when `role === 'admin'`; accepts optional `fallback`
- [x] `MatchCombobox` — searchable match selector (Radix Popover + client-side filter); used in Highlights creation form

### UI/UX
- [x] **Dark mode** — `ThemeContext` with `localStorage` persistence; toggles `dark` class on `<html>` (Tailwind `darkMode: ['class']`); toggle button in Header
- [x] **i18n** — `react-i18next` with English + Arabic locales; language toggle in Header; updates `dir` (ltr/rtl) and `lang` attributes on `<html>` on language change
- [x] **Language toggle** — switches between `en` / `ar` at runtime, persisted to `localStorage`

### Infrastructure
- [x] TanStack Query v5 with `invalidateQueries` on all mutations
- [x] React Hook Form + Zod for all forms with per-field error messages
- [x] Lazy-loaded routes (code splitting per page)
- [x] Toast notifications on all mutation success/error states
- [x] Dark-mode CSS variables in `index.css` (`.dark { ... }`)

### DevOps
- [x] Multi-stage `Dockerfile` (Node 20 Alpine builder → Nginx Alpine)
- [x] `nginx.conf` with SPA fallback, gzip, static asset caching, security headers
- [x] `.dockerignore` excluding `node_modules`, `dist`, `.env`
- [x] `.env.example` with `VITE_API_BASE_URL`
- [x] `VITE_API_BASE_URL` injectable at Docker build time via `--build-arg`

---

## TODO / Pending

### Low Priority
- [ ] **Role-specific UI** — Use `<RequireAdmin>` on remaining destructive actions (delete buttons, refund button)
- [ ] **User wallet view** — Show full wallet transaction history in UserDetailPage
- [ ] **E2E tests** — Playwright test suite for auth flow and CRUD operations
- [ ] **Unit tests** — Vitest for hooks (`useAuth`, `usePagination`) and utils
- [ ] **CI/CD pipeline** — GitHub Actions: lint → typecheck → build → Docker push
- [ ] **Error boundary** — Global React error boundary with friendly fallback UI
- [ ] **RTL layout polish** — Full RTL support for Sidebar and form layouts when Arabic is active

---

## Quick Start

```bash
# Development
cp .env.example .env
# Edit .env with your API URL
npm install
npm run dev          # → http://localhost:5173

# Production build
npm run build        # → dist/

# Docker
docker build \
  --build-arg VITE_API_BASE_URL=https://api.yallaplei.com/api/v1 \
  -t yalla-plei-admin .

docker run -p 8080:80 yalla-plei-admin
# → http://localhost:8080
```

## Auth Notes
- Login endpoint: `POST /api/v1/auth/login`
- Response: `{ access_token, refresh_token, user }` — both tokens are stored in `localStorage`
- Refresh endpoint: `POST /api/v1/auth/refresh` — called automatically by Axios interceptor on 401
- The JWT must contain a `role` claim of `"admin"` or `"manager"` — other roles are rejected by `ProtectedRoute`
- Access token stored under `yp_admin_token`; refresh token under `yp_admin_refresh_token`
