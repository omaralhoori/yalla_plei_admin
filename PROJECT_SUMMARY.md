# Yalla Plei Admin Dashboard — Project Summary

> **Stack**: React 18 + Vite + TypeScript (strict) · Tailwind CSS · Shadcn UI · React Router v6 · TanStack Query v5 · React Hook Form + Zod · Recharts · Axios  
> **API Base**: `https://api.yallaplei.com/api/v1`  
> **Build**: `npm run build` → `dist/`  
> **Docker**: `docker build --build-arg VITE_API_BASE_URL=<url> -t yalla-plei-admin .`

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
│   │   ├── sports/
│   │   │   ├── SportsPage.tsx      # Sports CRUD with image upload + toggles
│   │   │   └── TeamsPage.tsx       # Teams CRUD with logo upload + pagination
│   │   ├── pitches/
│   │   │   ├── PitchesPage.tsx     # Pitches CRUD with service selector + image
│   │   │   └── ServicesPage.tsx    # Pitch amenities CRUD
│   │   ├── matches/
│   │   │   └── MatchesPage.tsx     # Match scheduling/editing/cancellation
│   │   ├── financials/
│   │   │   └── FinancialsPage.tsx  # Transaction table + manual refund flow
│   │   └── settings/
│   │       └── SettingsPage.tsx    # Tabbed: Cancellation Policies + extensible
│   ├── hooks/
│   │   ├── useAuth.ts              # JWT decode, token helpers, role check
│   │   ├── usePagination.ts        # offset/limit pagination state
│   │   └── use-toast.ts            # Toast notification hook
│   ├── lib/
│   │   ├── api.ts                  # Axios instance + request/response interceptors
│   │   ├── queryClient.ts          # TanStack Query client config
│   │   └── utils.ts                # cn(), formatCurrency(), formatDate()
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
- [x] **Sports** — Full CRUD (list, create, edit, delete) with image upload and enable/available toggles
- [x] **Teams** — Full CRUD with paginated list and logo upload
- [x] **Pitches** — Full CRUD with sport selector, surface type, image upload, multi-service assignment
- [x] **Services** — Full CRUD for pitch amenities
- [x] **Matches** — Schedule/edit/cancel with sport filter, cancellation triggers wallet refunds
- [x] **Financials** — Filterable transactions (status/source/date range), manual refund with confirmation
- [x] **Settings** — Tabbed layout with full cancellation policy CRUD; extensible with placeholder tabs

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
- [ ] **Real pagination for transactions** — API currently returns an array; wire up `PaginatedResponse` envelope once backend is confirmed
- [ ] **Match detail view** — `/api/v1/matches/:id` with confirmed player count and available slots
- [ ] **Users management** — View/search all users, suspend/activate accounts
- [ ] **Bookings management** — Admin view of all bookings, manual cancel with refund

### Medium Priority
- [ ] **Dark mode toggle** — CSS variables are ready; add a theme context and header toggle
- [ ] **Role-specific UI** — Show/hide destructive actions based on `manager` vs `admin` role
- [ ] **Real-time notifications** — FCM integration for in-browser push alerts
- [ ] **Refresh token flow** — Implement token refresh instead of hard logout on expiry
- [ ] **Search/filter on tables** — Add search inputs to Sports, Teams, Pitches pages

### Low Priority
- [ ] **i18n (Arabic/English)** — RTL layout support with `react-i18next`
- [ ] **E2E tests** — Playwright test suite for auth flow and CRUD operations
- [ ] **Unit tests** — Vitest for hooks (`useAuth`, `usePagination`) and utils
- [ ] **CI/CD pipeline** — GitHub Actions: lint → typecheck → build → Docker push
- [ ] **Error boundary** — Global React error boundary with friendly fallback UI
- [ ] **Analytics dashboard v2** — Time-series charts using daily breakdown endpoint (if added)
- [ ] **Export to CSV** — Download transactions table as CSV

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
