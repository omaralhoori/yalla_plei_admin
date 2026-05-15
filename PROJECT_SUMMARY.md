# Yalla Plei Admin Dashboard — Project Summary

> **Stack**: React 18 + Vite + TypeScript (strict) · Tailwind CSS + Shadcn UI · React Router v6 · TanStack Query v5 · React Hook Form + Zod · Recharts · Axios  
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
│   │   ├── ui/                     # Shadcn UI primitives (Button, Input, Card, Table…)
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx       # Shell: sidebar + header + main
│   │   │   ├── Sidebar.tsx         # Nav links with active state
│   │   │   └── Header.tsx          # Breadcrumb + user dropdown
│   │   └── shared/
│   │       ├── DataTable.tsx       # Generic paginated table
│   │       ├── ConfirmDialog.tsx   # Destructive action confirmation modal
│   │       ├── ImageUpload.tsx     # Upload → POST /uploads → URL
│   │       ├── PageHeader.tsx      # Title + subtitle + action slot
│   │       └── StatusBadge.tsx     # Colored status pill
│   ├── features/
│   │   ├── auth/
│   │   │   └── LoginPage.tsx       # Email/password login with JWT storage
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx   # Reports summary + Recharts visualizations
│   │   ├── users/
│   │   │   ├── UsersPage.tsx       # Paginated user list with search/role filter + create admin modal
│   │   │   └── UserDetailPage.tsx  # User stats, player profiles, adjust points dialog
│   │   ├── sports/
│   │   │   ├── SportsPage.tsx      # Sports CRUD with image upload + toggles
│   │   │   └── TeamsPage.tsx       # Teams CRUD with logo upload + pagination
│   │   ├── pitches/
│   │   │   ├── PitchesPage.tsx     # Pitches CRUD + search bar + surface_type filter
│   │   │   └── ServicesPage.tsx    # Pitch amenities CRUD
│   │   ├── matches/
│   │   │   └── MatchesPage.tsx     # Match scheduling via /admin/matches + date/pitch/status filters + pitch services override
│   │   ├── financials/
│   │   │   └── FinancialsPage.tsx  # Transaction table + manual refund flow (JOD)
│   │   ├── loyalty/
│   │   │   └── LoyaltyPage.tsx     # Tabbed: Levels CRUD (with 409 overlap handling) + Rewards CRUD (with ImageUpload)
│   │   └── settings/
│   │       └── SettingsPage.tsx    # Tabbed: Cancellation Policies CRUD + extensible placeholder tabs
│   ├── hooks/
│   │   ├── useAuth.ts              # JWT decode, token helpers, role check
│   │   ├── usePagination.ts        # offset/limit pagination state
│   │   └── use-toast.ts            # Toast notification hook
│   ├── lib/
│   │   ├── api.ts                  # Axios instance + request/response interceptors
│   │   ├── queryClient.ts          # TanStack Query client config
│   │   └── utils.ts                # cn(), formatCurrency() [JOD], formatDate/Time(), timezone helpers
│   ├── router/
│   │   └── index.tsx               # Routes + ProtectedRoute guard
│   ├── types/
│   │   └── api.ts                  # All TypeScript API types and interfaces
│   ├── App.tsx                     # QueryClientProvider + RouterProvider + Toaster
│   ├── main.tsx                    # React root mount
│   ├── index.css                   # Tailwind directives + CSS variables
│   └── vite-env.d.ts               # Vite env type augmentation
├── nginx.conf                      # SPA fallback + gzip + security headers
├── Dockerfile                      # Multi-stage: Node build → nginx serve
├── .dockerignore
├── .env.example                    # VITE_API_BASE_URL template
├── components.json                 # Shadcn UI config
├── tailwind.config.js
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── vite.config.ts
└── package.json
```

---

## Implemented Features

### Security & Auth
- [x] Axios instance with automatic `Authorization: Bearer <token>` injection
- [x] Global 401/403 interceptor — clears token and redirects to `/login`
- [x] JWT payload decoder (no external dependency) — extracts `role`, `name`, `email`
- [x] `ProtectedRoute` — guards all admin pages; bounces non-admin roles to login
- [x] Token expiry check via `exp` claim

### Pages & Modules
- [x] **Login** — Email/password form, Zod validation, inline error handling, show/hide password
- [x] **Dashboard** — Date range filter, 4 stat cards, AreaChart + BarChart + PieChart via Recharts
- [x] **Users (CRM)** — Paginated user list, search by name/email/phone, role filter, "View" drill-down, create admin/manager modal
- [x] **User Detail** — Aggregate stats (points, matches, goals, assists, MVPs), player profiles per sport with level, adjust loyalty points dialog
- [x] **Sports** — Full CRUD (list, create, edit, delete) with image upload and enable/available toggles
- [x] **Teams** — Full CRUD with paginated list and logo upload
- [x] **Pitches** — Full CRUD + **search bar** + **surface_type dropdown filter** + service assignment
- [x] **Services** — Full CRUD for pitch amenities
- [x] **Matches** — Uses `/admin/matches` (all statuses) + **date-range pickers** + **pitch filter** + **status filter** + per-match services checklist pre-populated from pitch defaults (local ↔ UTC timezone conversion)
- [x] **Financials** — Filterable transactions (status/source/date range), manual refund with 2-step confirmation (JOD currency)
- [x] **Loyalty** — Tabbed: Levels CRUD (409 overlap error shown inline) + Rewards CRUD (image upload, required points)
- [x] **Settings** — Tabbed layout with full cancellation policy CRUD; extensible placeholder tabs

### Shared Components
- [x] `DataTable<T>` — generic typed table with skeleton loading and pagination
- [x] `ConfirmDialog` — reusable destructive/default action confirmation
- [x] `ImageUpload` — file picker → multipart POST → URL preview
- [x] `PageHeader` — consistent page title + action slot pattern
- [x] `StatusBadge` — mapped color badges for all status values

### Infrastructure
- [x] TanStack Query v5 with `invalidateQueries` on all mutations
- [x] React Hook Form + Zod for all forms with per-field error messages
- [x] Lazy-loaded routes (code splitting per page)
- [x] Toast notifications on all mutation success/error states
- [x] Dark-mode-ready CSS variables in `index.css`

### DevOps
- [x] Multi-stage `Dockerfile` (Node 20 Alpine builder → Nginx Alpine)
- [x] `nginx.conf` with SPA fallback, gzip, static asset caching, security headers
- [x] `.dockerignore` excluding `node_modules`, `dist`, `.env`
- [x] `.env.example` with `VITE_API_BASE_URL`
- [x] `VITE_API_BASE_URL` injectable at Docker build time via `--build-arg`

---

## TODO / Pending Integrations

### High Priority
- [ ] **Bookings management** — Admin view of all bookings (`GET /admin/bookings`?), manual cancel with refund
- [ ] **Real-time notifications** — FCM integration for in-browser push alerts
- [ ] **Refresh token flow** — Implement token refresh instead of hard logout on expiry

### Medium Priority
- [ ] **Role-specific UI** — Show/hide destructive actions based on `manager` vs `admin` role
- [ ] **Dark mode toggle** — CSS variables are ready; add a theme context and header toggle
- [ ] **User wallet view** — Show a user's wallet balance and transaction history from the detail page
- [ ] **Bookings per user** — Show booking history on the User Detail page

### Low Priority
- [ ] **i18n (Arabic/English)** — RTL layout support with `react-i18next`
- [ ] **E2E tests** — Playwright test suite for auth flow and CRUD operations
- [ ] **Unit tests** — Vitest for hooks (`useAuth`, `usePagination`) and utils
- [ ] **CI/CD pipeline** — GitHub Actions: lint → typecheck → build → Docker push
- [ ] **Error boundary** — Global React error boundary with friendly fallback UI
- [ ] **Export to CSV** — Download transactions table as CSV
- [ ] **Highlights module** — `GET /highlights` view/moderation page

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
- The JWT must contain a `role` claim of `"admin"` or `"manager"` — other roles are rejected by `ProtectedRoute`
- Token is stored in `localStorage` under key `yp_admin_token`
