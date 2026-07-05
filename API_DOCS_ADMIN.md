# Yalla Plei — Admin API Documentation

> **Base URL**: `https://api.yallaplei.com/api/v1`  
> **Version**: 3.21.0  
> **Audience**: Admin panel / back-office (role = `admin` or `manager`)  
> **Last Updated**: 2026-07-05

### What's New in 3.21.0
- **Home visit analytics**: see who opened the app / home screen — unique visitors by IP, visit counts, and daily summary. `GET /admin/analytics/visitors/summary` and `GET /admin/analytics/visitors`. See **Visit Analytics (Admin)**.

### What's New in 3.20.0
- **Dual scoring (monthly + XP)**: monthly point rules (`/admin/point-rules`) now feed **monthly competitive points** only; new **XP rules** (`GET/PUT /admin/xp-rules/:key`) drive levels/cards permanently with no subscriber boost. Admin manual adjustments apply to **XP**. Archived monthly leaderboards at `GET /admin/leaderboards/monthly/archives`. See **Points System** and **XP System**.

### What's New in 3.19.0
- **Promo items (offers / announcements / ads)**: full CRUD at `/admin/promo-items`. Define bilingual content (image, title, short & long descriptions), choose a type (`offer`, `announcement`, `ad`), set sort order, active flag, and optional schedule window. Active items appear to players via `GET /promo-items`. See **Promo Items Management (Admin)**.

### What's New in 3.18.0
- **Yellow / Blue match squads**: bookings now carry a `side` (`yellow` or `blue`) assigned automatically at registration to keep teams balanced. Referees manage squads via the Referee API (`GET /referee/matches/:id/players`, `PUT /referee/bookings/:id/team`, `POST /referee/bookings/:id/swap-team`).

### What's New in 3.17.0
- **Birthday greetings (automatic)**: a daily background job (08:00 Asia/Amman) finds users whose `date_of_birth` matches today and sends each a **push notification** and **SMS** congratulation. Templates are customisable via `PUT /admin/settings/birthday-messages` (`{name}` placeholder). Each user receives at most one greeting per calendar year (tracked via notification type `birthday`).

### What's New in 3.16.0
- **Goalkeeper participation**: players can join a match as goalkeeper (`participate_as_goalkeeper` on booking/reserve). Configure the discount via `PUT /admin/settings/goalkeeper-discount` (default **50%** off the join price after level discount). Max **2** goalkeepers per match. New loyalty point rule `goalkeeper_participation` (seeded on startup). Bookings expose `is_goalkeeper`; player stats include `goalkeeper_matches`.

### What's New in 3.15.0
- **New-match push broadcast**: creating a match (`POST /admin/matches` or `POST /admin/match-templates/:id/create-match`) now automatically sends a push notification to every player subscribed to the `new_matches` channel. No extra fields are required. Players manage their device tokens and channel subscriptions from the Player API (`POST/DELETE /users/devices`, `GET/POST /users/notifications/...`).

### What's New in 3.14.0
- **Rental pitch coordinates**: rentable pitches now accept `latitude` / `longitude` on create & update. Players can then **sort the pitch list by distance** from their location (in addition to rating and price) — see the Player API. Coordinates are optional.

### What's New in 3.13.0
- **Pitch managers (new role)**: a new user role `pitch_manager`. Create the account with `POST /admin/users` (`"role": "pitch_manager"`) and assign one or more rentable pitches to it with the new `manager_id` field on `POST/PUT /admin/rental-pitches`. A pitch manager has its own API (see **`API_DOCS_PITCH_MANAGER.md`**) where it sees only its pitches, views their bookings (booker **name + phone** only), blocks/unblocks off-platform slots, and is notified of new bookings. A **grace window** (`DefaultRentalHoldMinutes`, 15 min) prevents a manager from blocking a slot a player is mid-booking; abandoned unpaid holds are auto-released after the window.

### What's New in 3.12.0
- **Subscriptions (new section)**: manage the player subscription module. Create/edit/delete **monthly & annual plans** with pricing and store product ids (`/admin/subscription-plans`), tune the shared **benefits** — early-join minutes and profile theme (`/admin/subscription-config`), and **manage members**: list/filter subscriptions, inspect one, and cancel on a player's behalf (`/admin/subscriptions`). Boosted loyalty points are configured **per point rule** via `subscriber_points` (see **Points System**). Website billing runs on HyperPay (tokenized recurring charges); mobile runs on the App Store / Google Play. See **Subscriptions Management (Admin)**.

### What's New in 3.11.0
- **Online payment (HyperPay)**: cards & Apple Pay online payments via the HyperPay COPYandPAY widget. There are **no new admin endpoints** — it's configured entirely through **environment variables** (access token, channel entity ids, currency, etc.). See **Online Payment Configuration (HyperPay)**. Successful online payments appear in **Financial Transactions** with `source` = `card` / `apple_pay`.

### What's New in 3.10.0
- **Pitch rental (new section)**: manage rentable pitches independent of match pitches — set per-weekday opening hours, slotting rules (30-min slots; 1h/1.5h/2h bookings), price-per-hour, `phone_number`, `max_players` (capacity), services and a cancellation policy (`POST/PUT/DELETE /admin/rental-pitches`). The pitch list is filterable by `day_of_week`. **Block a slot** when a pitch is booked off-platform (`POST /admin/rental-pitches/:id/block`), browse all rental bookings (`GET /admin/rental-bookings`), and cancel/refund or unblock (`POST /admin/rental-bookings/:id/cancel`). Each pitch tracks an aggregated rating (1–5, only from players who rented it) and a cumulative `booking_count`.

### What's New in 3.9.0
- **Reserve now, pay later** approval workflow: players can reserve a seat instantly (status `pending_approval`) and pay off-platform. New endpoints to **approve** (`POST /admin/bookings/:id/approve`) or **reject/remove** (`POST /admin/bookings/:id/reject`) reservations, plus an admin-defined registration message (`PUT /admin/settings/registration-instructions`). Players are notified at each step (reserved, approved, removed).

### What's New in 3.8.0
- **Tiered cancellation refunds**: cancellation policies now carry a `refund_tiers` schedule (refund % by hours-before-kickoff) managed via the policy endpoints. Refunds at cancellation apply the matching tier automatically.

### What's New in 3.7.0
- **Audit trail** on all tables: `created_at`, `updated_at`, `created_by`, `updated_by` (stamped automatically from the authenticated admin/user).
- Central **`audit_logs`** table records every create/update/delete.
- **`GET /api/v1/admin/audit-logs`** — browse the audit history with filters (table, actor, date range).

---

## Authentication

All admin endpoints require a Custom JWT with `role = "admin"` or `role = "manager"`.

```
Authorization: Bearer <Custom_JWT>
```

Admin accounts are created by an existing admin via `POST /api/v1/admin/users` with `"role": "admin"` or `"role": "manager"`.

Any valid user with a different role (e.g. `"player"`) receives **`403 Forbidden`**.

Obtain a Custom JWT the same way players do:
- `POST /api/v1/auth/login` — email + password
- `POST /api/v1/auth/refresh` — refresh the token pair

---

## Standard Response Format

```json
{
  "success": true,
  "data": { ... },
  "error": "",
  "message": ""
}
```

### Paginated List Response

```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "meta": {
      "total_count": 142,
      "current_page": 2,
      "limit": 20,
      "has_next": true
    }
  }
}
```

**Pagination query params**: `?limit=20&offset=0`

---

## Database Schema (ERD Summary)

| Entity | Key Relations |
|--------|---------------|
| **User** | Has many: PlayerProfiles, WalletTransactions, DeviceTokens. Fields: `first_name`, `last_name`, `emergency_phone`, `date_of_birth`, `auth_provider` |
| **Sport** | Has many: Pitches, Matches |
| **Service** | `type`: `"facility"` (pitch amenity) or `"feature"` (match add-on). M2M with Pitches and Matches |
| **Pitch** | Belongs to Sport, M2M with Services (`type=facility`). Fields: `city`, `address`, `surface_type` |
| **Match** | Belongs to Sport+Pitch+Referee(User), Has many Bookings, M2M Services (`type=feature`), Has Policy. Fields: `duration`, `registration_opens_hours_before` |
| **MatchBooking** | Belongs to User+Match+Pitch. Fields: `side` (`yellow`/`blue`, auto-assigned for balance), `yellow_cards`, `red_cards`, `rating` (1.0–10.0), `points_earned`, `price_paid`, `is_goalkeeper` |
| **WaitlistEntry** | Belongs to User+Match. `status`: `waiting`/`offered`/`accepted`/`expired`/`cancelled`. Durable mirror of the Redis-backed queue + offer |
| **AppSetting** | Key/value store for admin-configurable runtime settings (e.g. `waitlist_offer_duration_minutes`, `deposit_instructions`) |
| **PaymentReceipt** | Belongs to User. Player-uploaded bank-deposit proof. `status`: `pending`/`approved`/`rejected`; on approval the `approved_amount` is credited to the wallet |
| **Country** | Admin-defined; has many Cities. Fields: `name_ar`, `name_en`, `code`, `is_enabled` |
| **City** | Belongs to Country. Names are unique within a country. Fields: `name_ar`, `name_en`, `is_enabled` |
| **User** | Additionally references `country_id`/`city_id` |
| **WalletTransaction** | Belongs to User (positive = credit, negative = debit) |
| **FinancialTransaction** | Belongs to User+Match+Booking |
| **Policy** | Cancellation policy; one can be marked default. Has many `PolicyRefundTier` (tiered refund schedule) |
| **PolicyRefundTier** | Belongs to Policy. `hours_before` + `refund_percent`: refunds a % of the paid amount based on hours remaining before kickoff |
| **Level** | Assigned by points range. Perks: `discount_percent` (auto-applied to match join price), `benefits_ar`/`benefits_en`. Player card: `card_type` identifier (e.g. `"gold"`) — the app renders the matching card design |
| **PointRule** | Admin-tunable scoring rule (`key`, `points`, `is_enabled`). Defines how players earn/lose points |
| **PlayerProfile** | Belongs to User+Sport+Level. `total_xp` drives level/card; `monthly_points` resets each month; `preferred_position` is per-sport |
| **LoyaltyPoints** | Belongs to User. Append-only points ledger (every earn/deduct/redeem is one row) |
| **LoyaltyReward** | Standalone |
| **RewardRedemption** | Belongs to User+Reward |
| **AuditLog** | Append-only mutation history: `table_name`, `record_id`, `action` (`create`/`update`/`delete`), `actor_id`, `created_at` |
| **SubscriptionPlan** | Purchasable plan. Fields: `code` (unique), `interval` (`monthly`/`annual`), `price`, `currency`, `apple_product_id`, `google_product_id`, `is_active`, `sort_order` |
| **SubscriptionConfig** | Single-row shared benefit config: `early_join_minutes`, `theme` (boosted points live on `PointRule.subscriber_points`) |
| **PlayerSubscription** | Belongs to User (one current row per user) + Plan. Fields: `provider` (`hyperpay`/`apple`/`google`), `status`, `current_period_start/end`, `auto_renew` |

### Audit Fields (all mutable tables)

Most admin-managed entities now expose:

| Field | Description |
|-------|-------------|
| `created_at` | When the row was created (UTC) |
| `updated_at` | When the row was last modified (UTC) |
| `created_by` | UUID of the user who created the row (`null` for legacy/system rows) |
| `updated_by` | UUID of the user who last updated the row |

Append-only ledgers (wallet transactions, loyalty points, notifications, etc.) expose `created_at` + `created_by` only.

System/automated actions use actor UUID `00000000-0000-0000-0000-000000000001` (displayed as **`system`** in audit-log responses).

### `auth_provider` Values

| Value | Description |
|-------|-------------|
| `local` | Email/password |
| `phone` | Phone OTP |
| `google` | Google Sign-In via Firebase |
| `apple` | Apple Sign-In via Firebase |
| `facebook` | Facebook Sign-In via Firebase |

---

## Timezone Policy

All times stored and returned in **UTC**.

---

## Sports Management

### `POST /api/v1/admin/sports`
**Auth**: admin or manager

**Request Body**:
```json
{ "name_ar": "كرة القدم", "name_en": "Football", "image_url": "football.png" }
```

**Response** `201`: created sport with enriched `image_url`.

**Error** `409`: `a record with this name already exists`

---

### `PUT /api/v1/admin/sports/:id`
**Auth**: admin or manager

**Request Body** (all optional):
```json
{
  "name_ar": "كرة القدم",
  "name_en": "Football",
  "image_url": "football.png",
  "is_enabled": true,
  "is_available": false
}
```

**Response** `200`: updated sport object.

---

### `DELETE /api/v1/admin/sports/:id`
**Auth**: admin or manager  
**Response** `200`: `{ "message": "sport deleted" }`

---

## Teams Management

### `POST /api/v1/admin/teams`
**Auth**: admin or manager

**Request Body**:
```json
{ "name_ar": "الفيصلي", "name_en": "Al-Faisaly", "logo_url": "faisaly.png" }
```

**Response** `201`: created team.

---

### `PUT /api/v1/admin/teams/:id`
**Auth**: admin or manager  
**Request Body**: same fields as POST.  
**Response** `200`: updated team.

---

### `DELETE /api/v1/admin/teams/:id`
**Auth**: admin or manager  
**Response** `200`: `{ "message": "team deleted" }`

---

## Pitches Management

### `POST /api/v1/admin/pitches`
**Auth**: admin or manager

**Request Body**:
```json
{
  "name_ar": "فاموس كورتس",
  "name_en": "Vamos Courts",
  "sport_id": "uuid",
  "image_url": "vamos.jpg",
  "city": "Amman",
  "address": "Na'our, Amman",
  "google_maps_url": "https://maps.google.com/...",
  "surface_type": "artificial"
}
```

**Response** `201`: created pitch.

---

### `PUT /api/v1/admin/pitches/:id`
**Auth**: admin or manager  
**Request Body**: same fields as POST (all optional).  
**Response** `200`: updated pitch.

> Use `PUT /api/v1/admin/pitches/:id/services` to manage the service (facility) mapping.

---

### `DELETE /api/v1/admin/pitches/:id`
**Auth**: admin or manager  
**Response** `200`: `{ "message": "pitch deleted" }`

---

### `PUT /api/v1/admin/pitches/:id/services`
**Auth**: admin or manager  
**Replaces** the full set of facility services linked to a pitch (many-to-many). Pass an empty array to clear all.

**Request Body**:
```json
{ "service_ids": ["uuid-1", "uuid-2"] }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `service_ids` | UUID[] | ✅ | IDs of `facility`-type services to associate |

**Response** `200`: updated pitch object with `services` populated.

---

## Services Management

A **service** represents either a `facility` (permanent pitch amenity, e.g. parking, changing rooms) or a `feature` (match add-on, e.g. extra ball, video recording).

### `GET /api/v1/admin/services`
**Auth**: admin or manager  
Returns all services ordered alphabetically. Filter by type optionally.

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | `"facility"` or `"feature"`. Omit to return all |

**Response** `200`:
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name_ar": "تغيير ملابس", "name_en": "Changing Rooms", "icon_code": "changing_rooms", "type": "facility" },
    { "id": "uuid", "name_ar": "كرة احتياطية", "name_en": "Extra Ball", "icon_code": "ball", "type": "feature" }
  ]
}
```

---

### `POST /api/v1/admin/services`
**Auth**: admin or manager

**Request Body**:
```json
{
  "name_ar": "تغيير ملابس",
  "name_en": "Changing Rooms",
  "icon_code": "changing_rooms",
  "type": "facility"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name_ar` | string | ✅ | Arabic name (unique) |
| `name_en` | string | ✅ | English name (unique) |
| `icon_code` | string | ❌ | Icon identifier for mobile app |
| `type` | string | ✅ | `"facility"` or `"feature"` |

**Response** `201`: created service object.  
**Error** `409`: `a record with this name already exists`

---

### `PUT /api/v1/admin/services/:id`
**Auth**: admin or manager  
**Request Body**: same fields as POST. `type` is updated only when a non-empty value is sent.  
**Response** `200`: updated service.  
**Error** `404`: service not found.

---

### `DELETE /api/v1/admin/services/:id`
**Auth**: admin or manager  
**Response** `200`: `{ "message": "service deleted" }`

---

## Countries & Cities Management

Admins define the countries and, within each country, the cities that players can pick
in their profile. Players read these via the public `GET /api/v1/countries` and
`GET /api/v1/countries/:id/cities` endpoints (which return **enabled** entries only).

### `GET /api/v1/admin/countries`
**Auth**: admin or manager  
Returns **all** countries (including disabled), ordered alphabetically.

**Response** `200`:
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name_ar": "الأردن", "name_en": "Jordan", "code": "JO", "is_enabled": true }
  ]
}
```

---

### `POST /api/v1/admin/countries`
**Auth**: admin or manager

**Request Body**:
```json
{ "name_ar": "الأردن", "name_en": "Jordan", "code": "JO", "is_enabled": true }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name_ar` | string | ✅ | Arabic name (unique) |
| `name_en` | string | ✅ | English name (unique) |
| `code` | string | ❌ | Optional ISO code (e.g. `"JO"`) |
| `is_enabled` | bool | ❌ | Defaults to `true`. Disabled countries are hidden from players |

**Response** `201`: created country.  
**Error** `409`: `a record with this name already exists`.

---

### `PUT /api/v1/admin/countries/:id`
**Auth**: admin or manager  
**Request Body**: same fields as POST (all optional; only provided fields change).  
**Response** `200`: updated country.  
**Error** `404`: `country not found`.

---

### `DELETE /api/v1/admin/countries/:id`
**Auth**: admin or manager  
**Response** `200`: `{ "message": "country deleted" }`

---

### `GET /api/v1/admin/countries/:id/cities`
**Auth**: admin or manager  
Returns **all** cities of a country (including disabled).

**Response** `200`:
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "country_id": "uuid", "name_ar": "عمّان", "name_en": "Amman", "is_enabled": true }
  ]
}
```

---

### `POST /api/v1/admin/cities`
**Auth**: admin or manager  
Creates a city under a country.

**Request Body**:
```json
{ "country_id": "uuid", "name_ar": "عمّان", "name_en": "Amman", "is_enabled": true }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `country_id` | UUID | ✅ | Parent country (must exist) |
| `name_ar` | string | ✅ | Arabic name (unique within the country) |
| `name_en` | string | ✅ | English name (unique within the country) |
| `is_enabled` | bool | ❌ | Defaults to `true` |

**Response** `201`: created city.  
**Errors**: `404` `country not found`; `409` `a record with this name already exists`.

---

### `PUT /api/v1/admin/cities/:id`
**Auth**: admin or manager  
**Request Body**: same fields as POST (all optional). `country_id` may be provided to move the city.  
**Response** `200`: updated city.  
**Error** `404`: `city not found`.

---

### `DELETE /api/v1/admin/cities/:id`
**Auth**: admin or manager  
**Response** `200`: `{ "message": "city deleted" }`

---

## Cancellation Policies Management

A cancellation policy now supports a **tiered refund schedule**: instead of a single
deadline, you define multiple `refund_tiers`, each granting a percentage of the amount
the player paid depending on how many hours remain before kickoff.

### How tiers are applied

Each tier has an `hours_before` threshold and a `refund_percent` (0–100). When a player
cancels, the system computes the hours remaining until the match and selects the tier
with the **largest `hours_before` that does not exceed** the hours remaining. If no tier
qualifies (the player cancelled too late), **no refund** is issued.

**Example** — tiers `[{8, 100}, {4, 50}, {2, 20}]` produce:

| Time of cancellation | Refund |
|----------------------|--------|
| More than 8 hours before the match | 100% |
| Between 8 and 4 hours before | 50% |
| Between 4 and 2 hours before | 20% |
| Less than 2 hours before | 0% (no refund) |

> The refund percentage is applied to `price_paid` (the amount actually charged, after any
> level discount) and credited to the player's wallet.

> **Legacy fallback:** if a policy has an **empty** `refund_tiers` array, the legacy
> `cancel_before_hours` single deadline is used (100% before it, 0% after).

### `GET /api/v1/admin/policies`
**Auth**: admin or manager

**Response** `200`:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Standard",
      "description_ar": "...",
      "description_en": "...",
      "cancel_before_hours": 24,
      "is_default": true,
      "refund_tiers": [
        { "id": "uuid", "policy_id": "uuid", "hours_before": 8, "refund_percent": 100 },
        { "id": "uuid", "policy_id": "uuid", "hours_before": 4, "refund_percent": 50 },
        { "id": "uuid", "policy_id": "uuid", "hours_before": 2, "refund_percent": 20 }
      ]
    }
  ]
}
```
> `refund_tiers` are returned sorted by `hours_before` descending.

---

### `POST /api/v1/admin/policies`
**Auth**: admin or manager

**Request Body**:
```json
{
  "name": "Flexible",
  "description_ar": "إلغاء مرن",
  "description_en": "Flexible cancellation",
  "cancel_before_hours": 8,
  "is_default": false,
  "refund_tiers": [
    { "hours_before": 8, "refund_percent": 100 },
    { "hours_before": 4, "refund_percent": 50 },
    { "hours_before": 2, "refund_percent": 20 }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Unique policy name |
| `description_ar` / `description_en` | string | ❌ | Localized descriptions |
| `cancel_before_hours` | int | ❌ | Legacy single-deadline fallback (used only when `refund_tiers` is empty) |
| `is_default` | bool | ❌ | Mark as the default policy applied to matches without an explicit policy |
| `refund_tiers` | array | ❌ | Tiered refund schedule (see below). Omit/empty to use the legacy deadline |
| `refund_tiers[].hours_before` | int | ✅ | Hours before kickoff this tier starts applying (≥ 0) |
| `refund_tiers[].refund_percent` | float | ✅ | Percentage refunded (0–100) |

**Response** `201`: created policy (with generated tier IDs).

**Errors**:
| Status | Error |
|--------|-------|
| `400` | `hours_before must be zero or greater` |
| `400` | `refund_percent must be between 0 and 100` |
| `400` | `duplicate hours_before value in refund_tiers` |
| `409` | `a record with this name already exists` |

---

### `PUT /api/v1/admin/policies/:id`
**Request Body**: same as POST. The supplied `refund_tiers` array **fully replaces** the
existing tiers (send the complete desired set; an empty array clears them).  
**Response** `200`: updated policy.

**Errors**: same validation errors as POST.

---

### `DELETE /api/v1/admin/policies/:id`
**Response** `200`: `{ "message": "policy deleted" }`  
> Deleting a policy also removes its refund tiers (cascade).

---

## Match Management

### `GET /api/v1/admin/matches`
**Auth**: admin or manager  
Returns all matches (no date/status restriction). Supports filtering.

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `sport_id` | UUID | Filter by sport |
| `pitch_id` | UUID | Filter by pitch |
| `status` | string | `"active"`, `"cancelled"` |
| `date_from` | `YYYY-MM-DD` | |
| `date_to` | `YYYY-MM-DD` | |
| `city` | string | Pitch city |
| `limit` | int | Default 20 |
| `offset` | int | Default 0 |

**Response** `200`: paginated match list (ordered by date DESC).

---

### `GET /api/v1/admin/matches/:id`
**Auth**: admin or manager  
Returns a single match. Bypasses the active-only filter (can retrieve cancelled matches).

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "sport_id": "uuid",
    "pitch_id": "uuid",
    "referee_id": "uuid",
    "date": "2026-06-15T00:00:00Z",
    "time": "2026-06-15T18:00:00Z",
    "duration": 90,
    "players_format": "6v6",
    "join_price": 6.00,
    "status": "active",
    "registration_opens_hours_before": 24,
    "cancellation_policy_id": "uuid",
    "sport": { "..." : "..." },
    "pitch": { "..." : "..." },
    "services": [
      { "id": "uuid", "name_en": "Extra Ball", "type": "feature" }
    ]
  }
}
```

---

### `POST /api/v1/admin/matches`
**Auth**: admin or manager  
Schedules a new match. On success, a push notification is broadcast to all players subscribed to the `new_matches` channel.

**Request Body**:
```json
{
  "sport_id": "uuid",
  "pitch_id": "uuid",
  "date": "2026-06-15T00:00:00Z",
  "time": "2026-06-15T18:00:00Z",
  "duration": 90,
  "players_format": "6v6",
  "join_price": 6.00,
  "cancellation_policy_id": "uuid",
  "referee_id": "uuid",
  "registration_opens_hours_before": 24,
  "status": "active"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sport_id` | UUID | ✅ | |
| `pitch_id` | UUID | ✅ | |
| `date` | RFC3339 | ✅ | Match date |
| `time` | RFC3339 | ✅ | Match start time (UTC) |
| `duration` | int | ✅ | Minutes. Default: `90` |
| `players_format` | string | ✅ | `"5v5"`, `"6v6"`, `"7v7"`, `"11v11"` |
| `join_price` | float | ✅ | Price per player in JD |
| `cancellation_policy_id` | UUID | ❌ | If omitted, the default policy applies |
| `referee_id` | UUID | ❌ | Assigns a referee to this match |
| `registration_opens_hours_before` | int | ❌ | Hours before match start when player registration opens. `0` (default) = always open |
| `status` | string | ❌ | `"active"` (default) |

**Response** `201`: created match object.

---

### `PUT /api/v1/admin/matches/:id`
**Auth**: admin or manager  
Modifies match details or cancels a match.

**Request Body** (all fields optional):
```json
{
  "date": "2026-06-16T00:00:00Z",
  "time": "2026-06-16T19:00:00Z",
  "duration": 90,
  "players_format": "6v6",
  "join_price": 6.00,
  "cancellation_policy_id": "uuid",
  "referee_id": "uuid",
  "registration_opens_hours_before": 48,
  "status": "cancelled"
}
```

| Field | Description |
|-------|-------------|
| `registration_opens_hours_before` | Set to `0` to remove the restriction and allow registration at any time |
| `status` | Set to `"cancelled"` to cancel the match (triggers refunds — see below) |

**Cancellation side-effects** — when `status` is set to `"cancelled"`:
1. All `confirmed` bookings for the match are moved to `cancelled`.
2. Each affected player receives a wallet refund equal to `join_price`.
3. The match's entire waitlist is cleared (all entries marked `cancelled`).

**Response** `200`: updated match object.  
**Error** `404`: match not found.

---

### `POST /api/v1/admin/matches/from-template`
**Auth**: admin or manager  
Creates a match by merging a template's default values with the provided date, time, and any optional overrides. Services defined on the template are automatically copied to the new match.

**Request Body**:
```json
{
  "template_id": "uuid",
  "date": "2026-06-15T00:00:00Z",
  "time": "2026-06-15T18:00:00Z",
  "join_price": 7.00
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `template_id` | UUID | ✅ | The template to base this match on |
| `date` | RFC3339 | ✅ | Match date |
| `time` | RFC3339 | ✅ | Match start time (UTC) |
| `duration` | int | ❌ | Overrides template value |
| `players_format` | string | ❌ | Overrides template value |
| `join_price` | float | ❌ | Overrides template value |
| `referee_id` | UUID | ❌ | Overrides template value |
| `cancellation_policy_id` | UUID | ❌ | Overrides template value |
| `registration_opens_hours_before` | int | ❌ | Overrides template value |
| `status` | string | ❌ | Default `"active"` |

**Response** `201`: created match object (same structure as `POST /admin/matches`).  
**Error** `404`: template not found.

---

## Match Templates

Templates store reusable default configurations for recurring matches at a specific pitch (e.g. "Tuesday Night 6v6 at Vamos"). When creating a match from a template, the admin only needs to supply the date and time; all other fields are pre-filled from the template and can be overridden individually.

### `GET /api/v1/admin/match-templates`
**Auth**: admin or manager  
Returns all templates, optionally filtered by pitch.

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `pitch_id` | UUID | Filter templates by pitch (optional) |

**Response** `200`:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Tuesday Night 6v6",
      "pitch_id": "uuid",
      "sport_id": "uuid",
      "duration": 90,
      "players_format": "6v6",
      "join_price": 6.00,
      "cancellation_policy_id": "uuid",
      "referee_id": null,
      "registration_opens_hours_before": 24,
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-01-01T00:00:00Z",
      "pitch": { "id": "uuid", "name_en": "Vamos Courts", "city": "Amman" },
      "sport": { "id": "uuid", "name_en": "Football" },
      "services": [
        { "id": "uuid", "name_en": "Extra Ball", "icon_code": "ball", "type": "feature" }
      ]
    }
  ]
}
```

---

### `POST /api/v1/admin/match-templates`
**Auth**: admin or manager  
Creates a new match template.

**Request Body**:
```json
{
  "name": "Tuesday Night 6v6",
  "pitch_id": "uuid",
  "sport_id": "uuid",
  "duration": 90,
  "players_format": "6v6",
  "join_price": 6.00,
  "cancellation_policy_id": "uuid",
  "referee_id": "uuid",
  "registration_opens_hours_before": 24
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Descriptive name (e.g. "Tuesday Night 6v6") |
| `pitch_id` | UUID | ✅ | The pitch this template is for |
| `sport_id` | UUID | ✅ | Sport |
| `duration` | int | ✅ | Match duration in minutes. Default: `90` |
| `players_format` | string | ✅ | e.g. `"5v5"`, `"6v6"`, `"7v7"` |
| `join_price` | float | ✅ | Default price per player in JD |
| `cancellation_policy_id` | UUID | ❌ | Default cancellation policy |
| `referee_id` | UUID | ❌ | Default referee |
| `registration_opens_hours_before` | int | ❌ | Default registration window in hours. `0` = always open |

**Response** `201`: created template object.

> After creating the template, use `PUT /admin/match-templates/:id/services` to associate feature services.

---

### `GET /api/v1/admin/match-templates/:id`
**Auth**: admin or manager  
Returns a single template with fully preloaded pitch, sport, and services.

**Response** `200`: template object (same structure as list, with full nested objects).  
**Error** `404`: template not found.

---

### `PUT /api/v1/admin/match-templates/:id`
**Auth**: admin or manager  
Updates an existing template. All fields from `POST` are accepted.

**Response** `200`: updated template.  
**Error** `404`: template not found.

---

### `DELETE /api/v1/admin/match-templates/:id`
**Auth**: admin or manager  
**Response** `200`: `{ "message": "template deleted" }`  
**Error** `404`: template not found.

---

### `PUT /api/v1/admin/match-templates/:id/services`
**Auth**: admin or manager  
Replaces the full set of feature services linked to this template. Pass an empty array to clear all.

**Request Body**:
```json
{ "service_ids": ["uuid-1", "uuid-2"] }
```

**Response** `200`: updated template with `services` populated.

---

## User Management (Admin)

### `GET /api/v1/admin/users`
**Auth**: admin or manager

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search name, email, or phone |
| `role` | string | `"player"`, `"referee"`, `"pitch_manager"`, `"admin"`, `"manager"` |
| `limit` | int | Default 20 |
| `offset` | int | Default 0 |

**Response** `200`: paginated user list.

---

### `POST /api/v1/admin/users`
**Auth**: admin or manager  
Creates an admin, manager, referee, or pitch-manager account.

**Request Body**:
```json
{
  "first_name": "Ahmed",
  "last_name": "Ali",
  "email": "ahmed@example.com",
  "phone": "+96279...",
  "password": "secret123",
  "role": "referee",
  "gender": "male"
}
```

| Field | Values |
|-------|--------|
| `role` | `"admin"`, `"manager"`, `"referee"`, `"pitch_manager"` |

**Response** `201`: created user. For `pitch_manager`, then assign pitches via `manager_id`
on `PUT /admin/rental-pitches/:id` — see **Pitch Managers**.

---

### `GET /api/v1/admin/users/:id`
**Auth**: admin or manager  
Returns full profile including player profiles, total points, wallet balance, and match stats.

---

### `PUT /api/v1/admin/users/:id/points`
**Auth**: admin or manager  
Manually adjust a player's points for a specific sport. The adjustment is applied
to the player's per-sport **`total_xp`** (creating the profile if it doesn't exist
yet), the player's level is re-evaluated, and the change is recorded in the loyalty
points ledger with the sport context.

**Request Body**:
```json
{
  "points": 50,
  "description": "Bonus for event participation",
  "sport_id": "uuid"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `points` | int | ✅ | Non-zero; negative values deduct points |
| `description` | string | ✅ | Shown in the player's points history |
| `sport_id` | UUID | ✅ | Sport the points apply to — updates profile total and level |

**Response** `200`: `{ "user_id": "...", "adjusted_points": 50, "description": "..." }`

**Error** `400`: `sport_id is required`  
**Error** `404`: user not found.

---

## Points System (Admin) — Monthly Points

Monthly points are **per-sport**, reset each calendar month (Asia/Amman), and used for
monthly rankings and reward redemption. The engine recalculates whenever a booking changes
(payment, referee stats, cancellation) and applies the **difference** to `monthly_points`.
Active subscribers are scored with `subscriber_points`. Every change is logged in
`loyalty_points` with `category: "monthly"`.

## XP System (Admin) — Permanent Experience

XP is **per-sport**, never resets, and drives **levels and player cards** (`total_xp`).
Same scoring actions as monthly rules, but configured separately via `xp_rules` with
**no subscriber boost**. Ledger entries use `category: "xp"`. Admin manual adjustments
(`PUT /admin/users/:id/points`) apply to XP.

### `GET /api/v1/admin/xp-rules`
**Auth**: admin or manager

Same shape as point rules but without `subscriber_points`.

### `PUT /api/v1/admin/xp-rules/:key`
**Auth**: admin or manager

**Request Body**: `{ "points": 10, "is_enabled": true, "name_ar": "...", "name_en": "..." }`

---

### `GET /api/v1/admin/leaderboards/monthly/archives`
**Auth**: admin or manager

**Query**: `period` (required `YYYY-MM`), `sport_id` (optional), `limit`, `offset`

Returns archived monthly top players with stats and `breakdown_json`.

---

## Points System (Admin) — Monthly Point Rules

### `GET /api/v1/admin/point-rules`
**Auth**: admin or manager  
Returns all scoring rules (the defaults are seeded automatically on startup).

**Response** `200`:
```json
{
  "success": true,
  "data": [
    { "key": "booking_paid",      "name_ar": "حجز مباراة والدفع",  "name_en": "Booking confirmed & paid", "points": 5,   "subscriber_points": 8,  "is_enabled": true, "updated_at": "..." },
    { "key": "attendance",        "name_ar": "حضور المباراة",       "name_en": "Match attendance",         "points": 5,   "subscriber_points": 8,  "is_enabled": true, "updated_at": "..." },
    { "key": "goal",              "name_ar": "تسجيل هدف",           "name_en": "Goal scored",              "points": 10,  "subscriber_points": 15, "is_enabled": true, "updated_at": "..." },
    { "key": "assist",            "name_ar": "صناعة هدف",           "name_en": "Assist",                   "points": 5,   "subscriber_points": 8,  "is_enabled": true, "updated_at": "..." },
    { "key": "mvp",               "name_ar": "رجل المباراة",        "name_en": "Man of the match",         "points": 20,  "subscriber_points": 30, "is_enabled": true, "updated_at": "..." },
    { "key": "rating_multiplier", "name_ar": "نقاط لكل درجة تقييم", "name_en": "Points per rating point",  "points": 1,   "subscriber_points": 2,  "is_enabled": true, "updated_at": "..." },
    { "key": "yellow_card",       "name_ar": "بطاقة صفراء",         "name_en": "Yellow card",              "points": -5,  "subscriber_points": -5, "is_enabled": true, "updated_at": "..." },
    { "key": "red_card",          "name_ar": "بطاقة حمراء",         "name_en": "Red card",                 "points": -10, "subscriber_points": -10,"is_enabled": true, "updated_at": "..." },
    { "key": "goalkeeper_participation", "name_ar": "المشاركة كحارس", "name_en": "Goalkeeper participation", "points": 5, "subscriber_points": 8, "is_enabled": true, "updated_at": "..." }
  ]
}
```

| Rule key | Awarded when |
|----------|--------------|
| `booking_paid` | The booking is confirmed (payment completed) |
| `attendance` | The referee/admin marks the player as attended |
| `goalkeeper_participation` | The player attended the match **as goalkeeper** (`is_goalkeeper` + `attended`) |
| `goal` / `assist` | Per goal / per assist recorded |
| `mvp` | The player is named man of the match |
| `rating_multiplier` | Per 1.0 of the referee's rating (e.g. value `2` × rating `7.5` → 15 points, rounded) |
| `yellow_card` / `red_card` | Per card — use **negative** values to deduct points |

**Subscriber points.** Each rule carries two values: `points` for normal players and
`subscriber_points` for **active subscribers**. When a subscriber's booking is scored,
the engine uses `subscriber_points` for every rule (e.g. attendance `5` → `8`). If a
rule's `subscriber_points` is left at `0`, the engine falls back to `points`, so
subscribers never earn less than a normal player by default. This is how the
subscription "boosted loyalty points" benefit is configured — there is no global
multiplier.

---

### `PUT /api/v1/admin/point-rules/:key`
**Auth**: admin or manager  
Updates a rule. All fields are optional; omitted fields keep their value.
Disabled rules contribute 0 points. Changes apply to bookings scored **after**
the update; already-awarded points are not retroactively recalculated.

**Request Body**:
```json
{ "points": 10, "subscriber_points": 15, "is_enabled": true, "name_ar": "تسجيل هدف", "name_en": "Goal scored" }
```
- `points`: value for normal players.
- `subscriber_points`: value for active subscribers (`0` = fall back to `points`).

**Response** `200`: the updated rule.

**Errors**:
| Status | Message |
|--------|---------|
| `400` | `nothing to update` |
| `404` | `point rule not found` |

---

## Levels Management (Admin)

Levels classify players by their per-sport **`total_xp`**. When XP crosses into
another level's range, the level is reassigned automatically (up **and** down).

### `GET /api/v1/admin/levels`
**Auth**: admin or manager

**Response** `200`:
```json
[
  {
    "id": "uuid",
    "name_ar": "ذهبي",
    "name_en": "Gold",
    "min_points": 200,
    "max_points": 499,
    "discount_percent": 10,
    "benefits_ar": "خصم 10% على حجز المباريات",
    "benefits_en": "10% discount on match bookings",
    "card_type": "gold"
  }
]
```

---

### `POST /api/v1/admin/levels`
**Request Body**:
```json
{
  "name_ar": "ذهبي",
  "name_en": "Gold",
  "min_points": 200,
  "max_points": 499,
  "discount_percent": 10,
  "benefits_ar": "خصم 10% على حجز المباريات",
  "benefits_en": "10% discount on match bookings",
  "card_type": "gold"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name_ar` / `name_en` | string | ✅ | Level display name |
| `min_points` / `max_points` | int | ✅ | Points range for this tier |
| `discount_percent` | float | ❌ | 0–100. Auto-applied to the join price when a player of this level books |
| `benefits_ar` / `benefits_en` | string | ❌ | Free-text perks description shown in the app |
| `card_type` | string | ❌ | Card type identifier (e.g. `"standard"`, `"silver"`, `"gold"`, `"platinum"`). The app uses this to render the matching card design locally |

**Errors**:
| Status | Message |
|--------|---------|
| `400` | `discount_percent must be between 0 and 100` |
| `409` | point range overlaps an existing level |

---

### `PUT /api/v1/admin/levels/:id`
**Request Body**: same fields as POST (all fields replaced).

---

### `DELETE /api/v1/admin/levels/:id`
**Response** `200`: `{ "message": "level deleted" }`

---

## Rewards Management (Admin)

### `GET /api/v1/admin/rewards`
**Response** `200`: list of loyalty rewards.

---

### `POST /api/v1/admin/rewards`
**Request Body**:
```json
{
  "name_ar": "قميص يلا بلي",
  "name_en": "Yalla Plei Jersey",
  "image_url": "jersey.png",
  "required_points": 500
}
```

---

### `PUT /api/v1/admin/rewards/:id`
**Request Body**: same as POST.

---

### `DELETE /api/v1/admin/rewards/:id`
**Response** `200`: `{ "message": "reward deleted" }`

---

## Bookings Management (Admin)

### `GET /api/v1/admin/bookings`
**Auth**: admin or manager  
Returns all bookings with optional filters.

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `user_id` | UUID | Filter by player |
| `match_id` | UUID | Filter by match |
| `status` | string | `"pending_payment"`, `"pending_approval"`, `"confirmed"`, `"cancelled"`, `"waitlist"` |
| `limit` | int | Default 20 |
| `offset` | int | Default 0 |

**Response** `200`: paginated list including player, match, pitch, sport details.

> Use `status=pending_approval` to list reserve-now/pay-later reservations awaiting review.

---

### `POST /api/v1/admin/bookings/:id/cancel`
**Auth**: admin or manager  
Admin-forced cancellation.

**Request Body**:
```json
{ "refund": true }
```

| Field | Description |
|-------|-------------|
| `refund` | If `true`, the amount the player actually paid (`price_paid`, i.e. after any level discount) is refunded to their wallet regardless of the cancellation policy |

**Response** `200`: `{ "message": "booking cancelled" }`

> **Waitlist side-effect:** cancelling a confirmed booking frees a seat, which is
> automatically offered to the first eligible player on that match's waitlist.

> **Points side-effect:** any points the booking had earned (booking bonus,
> attendance, goals, …) are revoked automatically; the deduction appears in the
> player's points history.

---

## Reserve Now, Pay Later — Approval Workflow (Admin)

Players can reserve a seat instantly (status `pending_approval`) without paying in-app,
then transfer the amount and send the receipt to the company WhatsApp. The seat counts
toward match capacity while it awaits review. Use the endpoints below to confirm or remove
the reservation. **The player is notified by push at each step.**

> Set the message players read before reserving (payment steps + WhatsApp number) via
> [`PUT /admin/settings/registration-instructions`](#put-apiv1adminsettingsregistration-instructions).

> 💡 List pending reservations with `GET /api/v1/admin/bookings?status=pending_approval`.

### `POST /api/v1/admin/bookings/:id/approve`
**Auth**: admin or manager  
Confirms a reserved booking after verifying the off-platform payment.

**Path Parameter**: `:id` — UUID of the booking (must be `pending_approval`)

**Response** `200`: the booking with `status: "confirmed"` and `price_paid` set (after any
level discount).

**Effects**:
- Records an `external` financial transaction for the paid amount.
- Awards the `booking_paid` points (admin-configured, default 5).
- Sends a "Booking Approved!" push to the player.

**Error Responses**:
| Status | Error |
|--------|-------|
| `404` | `booking not found` |
| `409` | `booking is not awaiting approval` — not in `pending_approval` state |
| `409` | `match is full` — every seat was confirmed by others in the meantime |

---

### `POST /api/v1/admin/bookings/:id/reject`
**Auth**: admin or manager  
Removes a reserved booking that was never paid for, freeing the seat for other players.

**Path Parameter**: `:id` — UUID of the booking (must be `pending_approval`)

**Request Body** (optional):
```json
{ "reason": "No payment received within the allowed time." }
```

| Field | Description |
|-------|-------------|
| `reason` | Optional. Included in the player's "Reservation Removed" notification |

**Response** `200`: the booking with `status: "cancelled"`.

**Effects**:
- Frees the seat; the first eligible waitlisted player is offered the spot.
- Sends a "Reservation Removed" push to the player (with the reason if provided).

**Error Responses**:
| Status | Error |
|--------|-------|
| `404` | `booking not found` |
| `409` | `booking is not awaiting approval` |

---

### `PUT /api/v1/admin/bookings/:id/stats`
**Auth**: admin or manager  
Updates a booking's match stats and recalculates the player's points through the
points engine (idempotent — re-submitting corrected stats adjusts by the
difference, it never double-counts).

> Moved from the player-accessible `PUT /api/v1/bookings/:id/stats`, which has
> been removed — only staff may edit stats. Referees use their own endpoint
> (`PUT /api/v1/referee/bookings/:id/stats`), which also supports cards and rating.

**Request Body**:
```json
{ "goals_count": 2, "assists_count": 1, "is_mvp": true, "attended": true }
```

**Response** `200`: `{ "message": "stats updated successfully" }`

---

## Waitlist Management (Admin)

When a match is full, players can join its waitlist. If a confirmed player withdraws
(self-cancel or admin cancel), the freed seat is offered to the **first player in the
queue** via a Firebase push notification. That player has a window — set by
[`PUT /admin/settings/waitlist-offer-duration`](#put-apiv1adminsettingswaitlist-offer-duration),
default **30 minutes** — to book before the offer passes to the next player, continuing
until the queue is exhausted. The live queue, the active offer, and its countdown are
held in Redis; a background worker advances expired offers automatically.

### `GET /api/v1/admin/matches/:id/waitlist`
**Auth**: admin or manager  
Returns the current ordered waitlist (waiting + offered entries) for a match, so admins
can track who is in line and who currently holds the seat offer.

**Path Parameter**: `:id` — UUID of the match

**Response** `200`:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "match_id": "uuid",
      "player_id": "uuid",
      "status": "offered",
      "position": 1,
      "offered_at": "2026-06-07T12:30:00Z",
      "expires_at": "2026-06-07T13:00:00Z",
      "created_at": "2026-06-07T12:00:00Z",
      "player": { "id": "uuid", "first_name": "Omar", "last_name": "Alhori", "avatar_url": "..." }
    },
    {
      "id": "uuid",
      "match_id": "uuid",
      "player_id": "uuid",
      "status": "waiting",
      "position": 2,
      "offered_at": null,
      "expires_at": null,
      "created_at": "2026-06-07T12:05:00Z",
      "player": { "id": "uuid", "first_name": "Sara", "last_name": "Nasser", "avatar_url": "..." }
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `status` | `waiting`, `offered`, `accepted`, `expired`, or `cancelled` (this endpoint returns only `waiting` and `offered`) |
| `position` | 1-based position in the queue (1 = next/current offer holder) |
| `offered_at` / `expires_at` | Set when an offer is active; `expires_at` is the booking deadline |

---

## Settings (Admin)

Admin-configurable runtime settings, stored in the `app_settings` key/value table.

### `GET /api/v1/admin/settings`
**Auth**: admin or manager  
Returns all settings. Known keys missing from the table are returned with their default.

**Response** `200`:
```json
{
  "success": true,
  "data": [
    { "key": "waitlist_offer_duration_minutes", "value": "30", "updated_at": "2026-06-07T10:00:00Z" },
    { "key": "deposit_instructions", "value": "Transfer to Bank ABC, IBAN JO00...", "updated_at": "2026-06-07T10:00:00Z" },
    { "key": "goalkeeper_discount_percent", "value": "50", "updated_at": "2026-07-04T10:00:00Z" }
  ]
}
```

---

### `PUT /api/v1/admin/settings/goalkeeper-discount`
**Auth**: admin or manager  
Sets the percentage discount applied to the join price when a player participates as
goalkeeper. The discount applies **after** any level discount on the match join price.

**Request Body**:
```json
{ "percent": 50 }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `percent` | int | ✅ | Discount percentage `0`–`100`. Default is `50` |

**Response** `200`:
```json
{
  "success": true,
  "data": { "key": "goalkeeper_discount_percent", "value": 50 }
}
```

**Error** `400`: `percent must be between 0 and 100`

---

### `PUT /api/v1/admin/settings/birthday-messages`
**Auth**: admin or manager  
Customises the templates used by the **daily birthday worker** (runs at **08:00 Asia/Amman**).
Every user with a `date_of_birth` matching today's month/day receives a push notification
and an SMS (when a phone number is on file). Use `{name}` as a placeholder for the
user's first name. Each user is greeted at most **once per calendar year**.

**Request Body** (all fields optional — omitted fields keep their current value):
```json
{
  "push_title": "عيد ميلاد سعيد! 🎂",
  "push_body": "كل عام وأنت بخير يا {name}! نتمنى لك عاماً مليان بطولات على الملعب — يلا بلّع",
  "sms_message": "يلا بلّع: عيد ميلاد سعيد يا {name}! كل عام وأنت بخير 🎂"
}
```

**Response** `200`: returns the effective templates after the update.

> Users must have `date_of_birth` set on their profile (registration or
> `PUT /users/profile`) to be eligible. The greeting appears in notification
> history with `type: "birthday"`.

---

### `PUT /api/v1/admin/settings/waitlist-offer-duration`
**Auth**: admin or manager  
Sets how long a waitlisted player has to book a freed seat before the offer passes to
the next player.

**Request Body**:
```json
{ "minutes": 30 }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `minutes` | int | ✅ | Offer window in minutes; must be greater than `0`. Default is `30` |

**Response** `200`:
```json
{
  "success": true,
  "data": { "key": "waitlist_offer_duration_minutes", "value": 30 }
}
```

**Error** `400`: `minutes must be greater than zero`

---

### `PUT /api/v1/admin/settings/deposit-instructions`
**Auth**: admin or manager  
Sets the message shown to players before they upload a payment receipt — typically the
company's bank account details. Players read it via `GET /api/v1/wallet/deposit-instructions`.

**Request Body**:
```json
{ "instructions": "Transfer the amount to Yalla Plei Co. — Bank ABC, IBAN JO00 0000 0000, then upload your receipt." }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `instructions` | string | ❌ | The message text. Pass an empty string to clear it |

**Response** `200`:
```json
{
  "success": true,
  "data": { "key": "deposit_instructions", "value": "Transfer the amount to ..." }
}
```

---

### `PUT /api/v1/admin/settings/registration-instructions`
**Auth**: admin or manager  
Sets the message a player reads **before reserving a seat** in the reserve-now/pay-later
flow — payment steps and where to send the transfer receipt (e.g. the company WhatsApp
number). Players read it via `GET /api/v1/bookings/registration-instructions`.

**Request Body**:
```json
{ "instructions": "Reserve your seat, transfer the amount to IBAN JO00 0000 0000, then send the receipt to WhatsApp +962 7 0000 0000 for confirmation." }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `instructions` | string | ❌ | The message text. Pass an empty string to clear it |

**Response** `200`:
```json
{
  "success": true,
  "data": { "key": "registration_instructions", "value": "Reserve your seat, transfer ..." }
}
```

---

## Payment Receipts (Admin)

Players top up their wallet by transferring money to the company's bank account and
uploading a receipt (see the player docs). Each submission lands here as a `pending`
receipt. On **approval**, the (optionally adjusted) amount is credited to the player's
wallet via a wallet transaction; on **rejection**, nothing is credited.

### `GET /api/v1/admin/receipts`
**Auth**: admin or manager  
Returns player-submitted receipts, most recent first.

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by `pending`, `approved`, or `rejected` |
| `user_id` | UUID | Filter by player |
| `limit` | int | Default 20 |
| `offset` | int | Default 0 |

**Response** `200`: paginated list of receipts. `image_url` is a full public URL; each
entry includes the embedded `user`.
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "amount": 50.00,
        "image_url": "https://api.yallaplei.com/uploads/receipts/2026/06/abc123.jpg",
        "note": "Transferred from my Bank ABC account",
        "status": "pending",
        "approved_amount": null,
        "admin_note": "",
        "reviewed_by": null,
        "reviewed_at": null,
        "created_at": "2026-06-07T12:00:00Z",
        "user": { "id": "uuid", "first_name": "Omar", "last_name": "Alhori", "avatar_url": "..." }
      }
    ],
    "meta": { "total_count": 5, "current_page": 1, "limit": 20, "has_next": false }
  }
}
```

---

### `GET /api/v1/admin/receipts/:id`
**Auth**: admin or manager  
Returns a single receipt.

**Response** `200`: receipt object.  
**Error** `404`: `payment receipt not found`.

---

### `POST /api/v1/admin/receipts/:id/approve`
**Auth**: admin or manager  
Approves a `pending` receipt and credits the amount to the player's wallet. The admin
may override the amount (e.g. if the player mistyped it).

**Request Body** (optional):
```json
{ "amount": 45.00, "note": "Verified against bank statement" }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | float | ❌ | Overrides the credited amount; must be `> 0`. Defaults to the player-submitted amount |
| `note` | string | ❌ | Admin note stored on the receipt |

**Response** `200`: the updated receipt with `status: "approved"`, `approved_amount`,
`reviewed_by`, and `reviewed_at` populated.

**Error Responses**:
| Status | Error | Description |
|--------|-------|-------------|
| `404` | `payment receipt not found` | Invalid ID |
| `409` | `payment receipt has already been reviewed` | Not in `pending` status |
| `400` | `amount must be greater than zero` | Invalid override amount |

---

### `POST /api/v1/admin/receipts/:id/reject`
**Auth**: admin or manager  
Rejects a `pending` receipt. Nothing is credited to the wallet.

**Request Body** (optional):
```json
{ "note": "Receipt is unreadable, please re-upload" }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `note` | string | ❌ | Rejection reason, surfaced to the player as `admin_note` |

**Response** `200`: the updated receipt with `status: "rejected"`.

**Error Responses**:
| Status | Error | Description |
|--------|-------|-------------|
| `404` | `payment receipt not found` | Invalid ID |
| `409` | `payment receipt has already been reviewed` | Not in `pending` status |

---

## Highlights Management (Admin)

### `GET /api/v1/admin/highlights`
**Auth**: admin or manager  
**Query Params**: `limit`, `offset`

---

### `POST /api/v1/admin/highlights`
**Auth**: admin or manager

**Request Body**:
```json
{
  "match_id": "uuid",
  "sport_id": "uuid",
  "media_url": "https://cdn.example.com/clip.mp4",
  "thumbnail_url": "https://cdn.example.com/thumb.jpg",
  "description": "Incredible goal",
  "date": "2026-06-15T00:00:00Z",
  "show_from": "2026-06-15T20:00:00Z",
  "show_to": "2026-06-22T20:00:00Z"
}
```

**Response** `201`: created highlight.

---

### `PUT /api/v1/admin/highlights/:id`
**Request Body**: same as POST (all optional).

---

### `DELETE /api/v1/admin/highlights/:id`
**Response** `200`: `{ "message": "highlight deleted" }`

---

## Visit Analytics (Admin)

Tracks app / home-screen opens reported by clients via `POST /analytics/home-visit`. Each unique **IP address** is a visitor; every call increments that visitor's `visit_count` and appends a visit event.

### `GET /api/v1/admin/analytics/visitors/summary`
**Auth**: admin or manager

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "total_unique_visitors": 1250,
    "total_visits": 8430,
    "new_visitors_today": 42,
    "visits_today": 318
  }
}
```

| Field | Description |
|-------|-------------|
| `total_unique_visitors` | Distinct IP addresses seen |
| `total_visits` | Total home-visit events (all time) |
| `new_visitors_today` | First-time IPs today (Asia/Amman) |
| `visits_today` | Home-visit events today |

---

### `GET /api/v1/admin/analytics/visitors`
**Auth**: admin or manager

**Query Params**:
| Param | Description |
|-------|-------------|
| `from` | `YYYY-MM-DD` — last visit on or after |
| `to` | `YYYY-MM-DD` — last visit on or before |
| `limit` | Default 20 |
| `offset` | Pagination |

**Response** `200**: paginated list of visitors:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "ip_address": "203.0.113.10",
        "user_id": "uuid",
        "visit_count": 12,
        "platform": "android",
        "user_agent": "YallaPlei/1.0",
        "first_visit_at": "2026-06-01T10:00:00Z",
        "last_visit_at": "2026-07-05T09:15:00Z",
        "user": { "id": "uuid", "first_name": "Omar", "last_name": "Ali" }
      }
    ],
    "meta": { "total_count": 1250, "current_page": 1, "limit": 20, "has_next": true }
  }
}
```

`user` is populated when the visitor was logged in on their most recent tracked visit.

---

## Promo Items Management (Admin)

Manage offers, announcements, and advertisements shown to players in the mobile/web app.

| Type | Use case |
|------|----------|
| `offer` | Discounts and special deals |
| `announcement` | Platform news and updates |
| `ad` | Sponsored content |

Upload images via the existing upload endpoint, then reference the returned path in `image_url`.

### `GET /api/v1/admin/promo-items`
**Auth**: admin or manager  
**Query Params**:

| Param | Type | Description |
|-------|------|-------------|
| `type` | string | Filter: `offer`, `announcement`, `ad` |
| `is_active` | bool | `true` / `false` |
| `limit` | int | Default 20 |
| `offset` | int | Pagination offset |

**Response** `200`: paginated list of promo items (includes inactive and scheduled items).

---

### `GET /api/v1/admin/promo-items/:id`
**Auth**: admin or manager

**Response** `200`: single promo item object.

**Error** `404`: not found.

---

### `POST /api/v1/admin/promo-items`
**Auth**: admin or manager

**Request Body**:
```json
{
  "type": "offer",
  "image_url": "/uploads/promo/summer.jpg",
  "title_ar": "عرض الصيف",
  "title_en": "Summer Offer",
  "short_description_ar": "خصم 20% على المباريات",
  "short_description_en": "20% off match bookings",
  "long_description_ar": "تفاصيل العرض الكاملة بالعربية…",
  "long_description_en": "Full offer details in English…",
  "is_active": true,
  "sort_order": 0,
  "show_from": "2026-07-01T00:00:00Z",
  "show_to": "2026-08-31T23:59:59Z"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | ✅ | `offer`, `announcement`, or `ad` |
| `image_url` | string | ✅ | Image path or URL |
| `title_ar` / `title_en` | string | ✅ | Bilingual title |
| `short_description_ar` / `short_description_en` | string | ❌ | Short text for list/card views |
| `long_description_ar` / `long_description_en` | string | ❌ | Full text for detail screen |
| `is_active` | bool | ❌ | Default `true` |
| `sort_order` | int | ❌ | Lower values appear first (default `0`) |
| `show_from` / `show_to` | ISO 8601 | ❌ | Optional visibility window |

**Response** `201`: created promo item.

**Error** `400`: invalid `type` or malformed body.

---

### `PUT /api/v1/admin/promo-items/:id`
**Auth**: admin or manager

**Request Body**: same fields as POST (all optional).

**Response** `200`: updated promo item.

---

### `DELETE /api/v1/admin/promo-items/:id`
**Auth**: admin or manager

**Response** `200`: `{ "message": "promo item deleted" }`

---

## Financial Transactions

### `GET /api/v1/admin/transactions`
**Auth**: admin or manager

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `user_id` | UUID | Filter by user |
| `status` | string | `"pending"`, `"completed"`, `"failed"` |
| `source` | string | `"wallet"`, `"card"`, `"apple_pay"` |
| `from` | `YYYY-MM-DD` | Start of date range |
| `to` | `YYYY-MM-DD` | End of date range |
| `limit` | int | Default 20 |
| `offset` | int | Default 0 |

**Response** `200`: paginated financial transactions.

---

### `POST /api/v1/admin/payments/manual-refund`
**Auth**: admin or manager  
Issues a manual wallet refund.

**Request Body**:
```json
{
  "user_id": "uuid",
  "amount": 6.00,
  "description": "Manual refund for match cancellation"
}
```

**Response** `200`: `{ "message": "refund issued" }`

---

## Audit Logs

Browse the central mutation history written automatically whenever any table row is created, updated, or deleted.

### `GET /api/v1/admin/audit-logs`
**Auth**: admin or manager

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `table_name` | string | Filter by database table (e.g. `matches`, `users`, `payment_receipts`) |
| `actor_id` | UUID or `system` | Filter by the user who performed the action |
| `from` | `YYYY-MM-DD` | Start of date range (inclusive, UTC) |
| `to` | `YYYY-MM-DD` | End of date range (inclusive, UTC) |
| `limit` | int | Page size (default `20`, max `100`) |
| `offset` | int | Pagination offset (default `0`) |

**Example**:
```
GET /api/v1/admin/audit-logs?table_name=matches&actor_id=550e8400-e29b-41d4-a716-446655440000&from=2026-06-01&to=2026-06-17&limit=20&offset=0
GET /api/v1/admin/audit-logs?actor_id=system&from=2026-06-17
```

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "table_name": "matches",
        "record_id": "uuid",
        "action": "update",
        "actor_id": "550e8400-e29b-41d4-a716-446655440000",
        "actor_name": "Omar Alhori",
        "created_at": "2026-06-17T14:30:00Z"
      },
      {
        "id": "uuid",
        "table_name": "payment_receipts",
        "record_id": "uuid",
        "action": "create",
        "actor_id": "00000000-0000-0000-0000-000000000001",
        "actor_name": "system",
        "created_at": "2026-06-17T12:00:00Z"
      }
    ],
    "meta": {
      "total_count": 142,
      "current_page": 1,
      "limit": 20,
      "has_next": true
    }
  }
}
```

| Field | Description |
|-------|-------------|
| `table_name` | PostgreSQL table that was mutated |
| `record_id` | Primary key of the affected row (string) |
| `action` | `create`, `update`, or `delete` |
| `actor_id` | UUID of the acting user, or the system actor UUID |
| `actor_name` | Resolved display name (first + last name, or email). `system` for automated actions |
| `created_at` | When the mutation was recorded (UTC) |

**Error Responses**:
| Status | Description |
|--------|-------------|
| `400` | Invalid `actor_id`, `from`, or `to` format |
| `403` | Caller is not admin/manager |

> 💡 **Tip:** combine `table_name` + `record_id` to reconstruct the full change history of a single entity. Use `created_by` / `updated_by` on the entity itself for the latest snapshot without querying logs.

---

## Reports

### `GET /api/v1/admin/reports/summary`
**Auth**: admin or manager

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `from` | `YYYY-MM-DD` | Start date |
| `to` | `YYYY-MM-DD` | End date |

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "total_revenue": 1500.00,
    "total_bookings": 250,
    "new_users": 42,
    "most_popular_pitch_id": "uuid",
    "most_popular_pitch_name": "Vamos Courts",
    "most_popular_pitch_bookings": 80
  }
}
```

---

## Pitch Rental

A standalone rental system, separate from match pitches (separate table and endpoints).
A rentable pitch publishes a **weekly schedule** (per-weekday opening windows), is priced
**per hour**, and has its day split into fixed **slots** (default 30 minutes). Players book
a continuous block between `min_duration_minutes` and `max_duration_minutes` (default 1h–2h)
and **bookings can never overlap** (always 1h / 1.5h / 2h). Each pitch can use its own
**cancellation policy** and carries an aggregated **rating** (1–5, submitted only by players
who rented it) plus a cumulative `booking_count` (confirmed rentals; never decremented).

### `GET /api/v1/admin/rental-pitches`
**Auth**: admin or manager — lists **all** rentable pitches (including inactive).
Query params: `sport_id`, `city`, `search`, `day_of_week` (`0=Sunday…6=Saturday`, keeps only
pitches open that weekday).

### `GET /api/v1/admin/rental-pitches/:id`
**Auth**: admin or manager — a single rentable pitch with `services`, `availabilities`, and
`cancellation_policy` (+ `refund_tiers`).

### `POST /api/v1/admin/rental-pitches`
**Auth**: admin or manager

**Request**:
```json
{
  "name_ar": "ملعب فاموس",
  "name_en": "Vamos Arena",
  "sport_id": "uuid",
  "image_url": "rental/2026/06/abc.jpg",
  "city": "Amman",
  "address": "Na'our, Amman",
  "google_maps_url": "https://maps.google.com/...",
  "surface_type": "grass",
  "phone_number": "+962790000000",
  "latitude": 31.9539,
  "longitude": 35.9106,
  "max_players": 14,
  "price_per_hour": 30.0,
  "slot_minutes": 30,
  "min_duration_minutes": 60,
  "max_duration_minutes": 120,
  "is_active": true,
  "manager_id": "uuid-or-null",
  "cancellation_policy_id": "uuid-or-null",
  "service_ids": ["uuid", "uuid"],
  "availabilities": [
    { "day_of_week": 1, "open_time": "16:30", "close_time": "23:00" },
    { "day_of_week": 5, "open_time": "10:00", "close_time": "23:00" }
  ]
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `name_ar`, `name_en`, `sport_id` | ✅ | Names are unique |
| `phone_number` | ❌ | Pitch contact phone shown to players |
| `latitude` / `longitude` | ❌ | Decimal-degree coordinates. Enable players to **sort pitches by distance** from their location; omit (`null`) if unknown |
| `max_players` | ❌ | Maximum players the pitch can host (capacity) |
| `price_per_hour` | ❌ | Booking price = `price_per_hour × minutes / 60` |
| `slot_minutes` | ❌ | Default `30` |
| `min_duration_minutes` / `max_duration_minutes` | ❌ | Defaults `60` / `120`; snapped to whole slots, `max ≥ min` |
| `is_active` | ❌ | Default `true`. Inactive pitches are hidden from players and can't be booked |
| `manager_id` | ❌ | User id (role `pitch_manager`) who manages this pitch. `null` = unmanaged. See **Pitch Managers** |
| `cancellation_policy_id` | ❌ | Falls back to the default policy when null |
| `service_ids` | ❌ | Facilities (the existing services) attached to the pitch |
| `availabilities` | ❌ | Per-weekday windows; `day_of_week` `0=Sun…6=Sat`, times `HH:MM`. A missing weekday is closed |

**Response** `201`: the created pitch.

### `PUT /api/v1/admin/rental-pitches/:id`
**Auth**: admin or manager — same body as create. Include `availabilities` to **replace**
the whole schedule, and `service_ids` to **replace** the services. Omit either key to leave
it unchanged. `manager_id` is overwritten by the value sent — send the id to assign a pitch
manager, or `null` to unassign.

### `DELETE /api/v1/admin/rental-pitches/:id`
**Auth**: admin or manager.

### `PUT /api/v1/admin/rental-pitches/:id/services`
**Auth**: admin or manager — replace the pitch's services.
```json
{ "service_ids": ["uuid", "uuid"] }
```

### `POST /api/v1/admin/rental-pitches/:id/block`
**Auth**: admin or manager

Close a time block on a pitch (e.g. it was booked **off-platform**). The block occupies
the slot exactly like a booking, so players can't double-book it.

**Request**:
```json
{ "date": "2026-07-01", "start_time": "20:00", "duration_minutes": 120, "note": "Booked via WhatsApp" }
```

**Response** `201`: a rental booking with `is_external: true`, `status: "confirmed"`,
`player_id: null`. The same opening-hours / overlap validation as player bookings applies.

> **Grace window**: a player's unpaid (`pending_payment`) booking holds its slot for
> `DefaultRentalHoldMinutes` (15 min). Blocking a slot that a player is mid-booking is
> rejected with `409 a player is currently booking this slot; please try again shortly`.
> Once the window lapses the unpaid hold is auto-released and the slot can be blocked/booked.

**Errors**: `409 the requested time overlaps an existing booking`,
`409 a player is currently booking this slot...`, `400` for closed-day / out-of-hours /
invalid duration, `404 rental pitch not found`.

### `GET /api/v1/admin/rental-bookings`
**Auth**: admin or manager — paginated list of rental bookings (player bookings and blocks),
each embedding `rental_pitch` and `player`.

**Query params**: `rental_pitch_id`, `player_id`, `status` (`pending_payment`, `confirmed`,
`cancelled`), `date_from`, `date_to` (`YYYY-MM-DD`).

### `POST /api/v1/admin/rental-bookings/:id/cancel`
**Auth**: admin or manager

Cancel a rental booking or remove a block. Optional body `{ "reason": "..." }`. A
**confirmed, paid** player booking is **refunded in full** to the player's wallet and the
player is notified; a block is simply removed, freeing the slot.

**Response** `200`: the cancelled booking.

---

## Pitch Managers

A **pitch manager** is a delegated account that operates a specific set of rentable pitches
on the owner's behalf, without admin access. They get a **dedicated API** documented in
**`API_DOCS_PITCH_MANAGER.md`**.

### What a pitch manager can do
- See **only the pitches assigned to them** and each pitch's availability.
- View the **bookings** on their pitches — limited to the booker's **name and phone number**
  (no wallet, email or other PII).
- **Block / unblock** slots for off-platform bookings on their pitches.
- Receive a **push notification** whenever a new booking is confirmed on one of their pitches.

They **cannot** manage pitches (create/edit/delete), see other pitches, cancel/refund player
bookings, or touch any other part of the system.

### Setting one up (admin)
1. **Create the user** with the new role:
   ```
   POST /api/v1/admin/users
   { "first_name": "Sami", "last_name": "Odeh", "phone": "+962790000000",
     "email": "sami@example.com", "password": "•••••", "role": "pitch_manager" }
   ```
2. **Assign pitches** to them by setting `manager_id` on each rentable pitch
   (`POST` on create or `PUT /admin/rental-pitches/:id`). One manager can own many pitches;
   set `manager_id: null` to unassign.

### Concurrency / grace window
When a player starts a booking, the slot is held for `DefaultRentalHoldMinutes` (15 min,
measured from when the unpaid booking was created). During that window the pitch manager
**cannot** block the slot — the block call returns
`409 a player is currently booking this slot; please try again shortly`. This prevents a
manager from blocking a slot a player is actively paying for. If the player doesn't finish
within the window, the hold is treated as abandoned and released automatically, freeing the
slot for both other players and the manager.

> The user-creation endpoint accepts `role: "pitch_manager"` exactly like `referee` — see
> **Users** above.

---

## Online Payment Configuration (HyperPay)

Online card and **Apple Pay** payments are handled by **HyperPay** (OPPWA) using the
[COPYandPAY](https://hyperpay.docs.oppwa.com/integrations/widget) widget. The players'
endpoints (`POST /payments/checkout`, `GET /payments/checkout/status`) are documented in
the Player API. There is **no admin API** to manage this — all settings (including the
secrets) are read from **environment variables** on the backend, so nothing sensitive is
stored in the database or exposed over the API.

### Environment variables

| Variable | Secret | Description |
|----------|:------:|-------------|
| `HYPERPAY_ENABLED` | – | `true` to enable online payment. When `false`, checkout endpoints return `503 online payment is not enabled`. |
| `HYPERPAY_BASE_URL` | – | API/widget host. Test: `https://eu-test.oppwa.com`. Production: `https://eu-prod.oppwa.com`. |
| `HYPERPAY_ACCESS_TOKEN` | ✅ | Bearer access token issued by HyperPay. |
| `HYPERPAY_ENTITY_ID_CARDS` | ✅ | Channel **entityId** for card brands (VISA/MASTER/MADA…). |
| `HYPERPAY_ENTITY_ID_APPLE_PAY` | ✅ | Channel **entityId** enabled for Apple Pay. |
| `HYPERPAY_CURRENCY` | – | ISO currency for charges, e.g. `SAR` or `JOD`. |
| `HYPERPAY_BRANDS_CARDS` | – | Widget `data-brands` for cards, e.g. `VISA MASTER MADA`. |
| `HYPERPAY_BRANDS_APPLE_PAY` | – | Widget `data-brands` for Apple Pay, e.g. `APPLEPAY`. |
| `HYPERPAY_SHOPPER_RESULT_URL` | – | Website page HyperPay redirects to after payment (receives `?resourcePath=...`). |
| `HYPERPAY_MERCHANT_URL` | – | The merchant's website URL, sent as `merchant.url` (required for 3-D Secure). Defaults to `APP_URL`. |
| `HYPERPAY_TEST_MODE` | – | `true` to send the **test-server-only** parameters (`testMode=EXTERNAL`, `customParameters[3DS2_enrolled]=true`, `customParameters[3DS2_flow]=challenge`). Auto-defaults to `true` when `HYPERPAY_BASE_URL` contains `test`. **Set to `false` in production.** |
| `HYPERPAY_BILLING_STREET` | – | Default `billing.street1` (3DS risk data) when the customer has no stored address. |
| `HYPERPAY_BILLING_CITY` | – | Default `billing.city`. Overridden by the customer's city when known. |
| `HYPERPAY_BILLING_STATE` | – | Default `billing.state`. |
| `HYPERPAY_BILLING_COUNTRY` | – | Default `billing.country`, ISO Alpha-2 (e.g. `SA`). Overridden by the customer's country code when known. |
| `HYPERPAY_BILLING_POSTCODE` | – | Default `billing.postcode`. |

> HyperPay typically issues a **separate entityId per channel** (one for cards, one for
> Apple Pay). Set both; the backend picks the right one based on the player's chosen
> `brand`.

> **Test server (3-D Secure)**: HyperPay's integrator test environment requires
> `testMode=EXTERNAL` plus the `3DS2_enrolled`/`3DS2_flow=challenge` custom parameters and a
> full `merchant.url` + `billing.*` block. These are sent automatically while
> `HYPERPAY_TEST_MODE=true` (auto-enabled on the test host). Billing fields fall back to the
> `HYPERPAY_BILLING_*` defaults and are enriched with the customer's real country/city when
> available. Make sure to set `HYPERPAY_TEST_MODE=false` and the proper `HYPERPAY_MERCHANT_URL`
> in production.

### What the backend does

1. **Prepare checkout** — server-to-server `POST {BASE_URL}/v1/checkouts` with
   `entityId`, `amount`, `currency`, `paymentType=DB`, `integrity=true`, `merchant.url`,
   the customer (`customer.email/givenName/surname`) + `billing.*` block, and a unique
   `merchantTransactionId`; returns a `checkoutId` + `integrity` hash (PCI DSS v4). On the
   test server it also sends `testMode=EXTERNAL` and the `3DS2` simulation parameters.
2. **Status** — `GET {BASE_URL}{resourcePath}?entityId=...`; the result code decides
   success/pending/failure. On success the related match/rental booking is confirmed (or
   the wallet credited) and a **Financial Transaction** is recorded.

### Front-end / ops checklist (website)

- Load the widget script with the returned `integrity` and `crossorigin="anonymous"`.
- Add the required **Content-Security-Policy** for the HyperPay host (per the HyperPay PCI
  v4 guidance), using a per-request nonce on your own scripts.
- For **Apple Pay**: serve the site over HTTPS, host the Apple Pay domain-association file,
  and register the domain with Apple/HyperPay; ensure the Apple Pay entity is enabled.
- Switch `HYPERPAY_BASE_URL` to the production host and use production credentials when
  going live.

---

## Subscriptions Management (Admin)

The player subscription module lets players subscribe **monthly** or **annually** to
unlock premium perks. Admins manage three things: the **plans** (pricing), the shared
**benefit configuration** (the perks themselves), and the **members** (active/past
subscriptions).

**How players are billed**
- **Website** → **HyperPay** (card / Apple Pay). The card is tokenized so renewals can be
  charged automatically; uses the same HyperPay configuration as **Online Payment**.
- **Mobile** → **Apple App Store** / **Google Play**. The mobile app maps a plan to a
  store product via `apple_product_id` / `google_product_id` and reports purchases to the
  backend.

> A background worker expires subscriptions automatically once their paid period ends.

### The benefits

| Benefit | Where it's configured | Effect |
|---------|-----------------------|--------|
| Early match access | `subscription-config.early_join_minutes` | Subscribers may register for a match this many minutes **before** the public registration window opens. |
| Boosted loyalty points | **Point rules** `subscriber_points` (see **Points System**) | Each scoring action awards more points to subscribers (e.g. attendance `5` → `8`). Configured per rule via `PUT /admin/point-rules/:key` — there is no global multiplier. |
| Premium profile theme | `subscription-config.theme` | Theme key surfaced on the player profile (`is_subscribed` + `subscription_theme`) so other players see their premium profile. |

---

### Plans

#### `GET /api/v1/admin/subscription-plans`
Lists **all** plans (active and inactive), ordered by `sort_order`, then `price`.

#### `POST /api/v1/admin/subscription-plans`
Creates a plan.

**Request:**
```json
{
  "code": "annual",
  "name_ar": "بريميوم سنوي",
  "name_en": "Premium Annual",
  "interval": "annual",
  "price": 299.0,
  "currency": "SAR",
  "apple_product_id": "com.yallaplei.sub.annual",
  "google_product_id": "sub_annual",
  "is_active": true,
  "sort_order": 2
}
```
- `code` (required, unique): stable identifier, e.g. `monthly` / `annual`.
- `interval` (required): `monthly` | `annual`.
- `price`: charged amount per period (website billing). `currency` defaults to `SAR`.
- `apple_product_id` / `google_product_id`: store product ids the mobile apps map to this plan.
- `is_active` (default `true`), `sort_order` (display order).

**Response** `201`: the created plan.

#### `PUT /api/v1/admin/subscription-plans/:id`
Updates a plan. All fields optional; send only what changes (`name_ar`, `name_en`,
`price`, `currency`, `apple_product_id`, `google_product_id`, `is_active`, `sort_order`).
Changing `price` affects **future** charges/renewals.

#### `DELETE /api/v1/admin/subscription-plans/:id`
Deletes a plan.

**Errors:** `404 subscription plan not found`, `400 invalid request` (e.g. bad `interval`),
`409` on duplicate `code`.

---

### Benefit configuration

#### `GET /api/v1/admin/subscription-config`
Returns the single shared benefit configuration (created with defaults on first read).

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "early_join_minutes": 15,
    "theme": "premium"
  }
}
```

#### `PUT /api/v1/admin/subscription-config`
Updates the benefit configuration. All fields optional.

**Request:**
```json
{
  "early_join_minutes": 20,
  "theme": "gold"
}
```
- `early_join_minutes`: how many minutes before public registration subscribers may join.
- `theme`: profile theme key the app renders for subscribers.

> **Boosted loyalty points** are **not** set here — configure them per scoring action via
> `subscriber_points` on the point rules (`PUT /admin/point-rules/:key`, see **Points System**).

**Response** `200`: the updated configuration. Changes apply immediately to all active subscribers.

---

### Members

#### `GET /api/v1/admin/subscriptions`
Lists player subscriptions.

**Query params:** `status` (`active` | `cancelled` | `expired` | `pending`),
`provider` (`hyperpay` | `apple` | `google`), `limit` (default 20), `offset`.

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "subscriptions": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "plan_id": "uuid",
        "interval": "monthly",
        "provider": "hyperpay",
        "status": "active",
        "current_period_start": "2026-06-27T10:00:00Z",
        "current_period_end": "2026-07-27T10:00:00Z",
        "auto_renew": true,
        "cancelled_at": null,
        "plan": { "id": "uuid", "code": "monthly", "interval": "monthly", "price": 29.0 }
      }
    ],
    "total": 1
  }
}
```

#### `GET /api/v1/admin/subscriptions/:id`
Returns a single subscription with its plan.

#### `POST /api/v1/admin/subscriptions/:id/cancel`
Cancels a subscription on the player's behalf. Auto-renew is turned off and the benefits
remain until `current_period_end`; for HyperPay the recurring schedule is stopped.

**Errors:** `404 subscription not found`.

---

## Error Codes Reference (Admin)

| HTTP Status | Error Key | Description |
|-------------|-----------|-------------|
| `400` | `invalid_input` | Malformed request body |
| `401` | `unauthorized` | Missing/invalid auth token |
| `403` | `forbidden` | Role is not admin or manager |
| `404` | `not_found` | Resource doesn't exist |
| `409` | `a record with this name already exists` | Duplicate name for sport/service/team/level |
| `409` | `point range overlaps with an existing level` | Level point range conflict |
| `400` | `discount_percent must be between 0 and 100` | Invalid level discount |
| `404` | `point rule not found` | Unknown point rule key |
| `400` | `nothing to update` | Empty point rule update body |
| `400` | `minutes must be greater than zero` | Invalid waitlist offer duration |
| `400` | `amount must be greater than zero` | Invalid receipt approval amount |
| `404` | `payment receipt not found` | Invalid receipt ID |
| `409` | `payment receipt has already been reviewed` | Receipt not in `pending` status |
| `404` | `rental pitch not found` | Invalid rental pitch ID |
| `404` | `rental booking not found` | Invalid rental booking ID |
| `409` | `the requested time overlaps an existing booking` | Rental slot already taken (booking or block) |
| `400` | `the requested time is outside the pitch's opening hours` | Block/booking outside the opening window |
| `400` | `the pitch is closed on the selected day` | No opening window that weekday |
| `400` | `invalid booking duration for this pitch` | Duration below min / above max / not slot-aligned |
| `500` | `internal server error` | Unexpected server error |
