// ─── Standard Response Envelopes ────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
  message?: string
}

export interface PaginationMeta {
  total_count: number
  current_page: number
  limit: number
  has_next: boolean
}

export interface PaginatedResponse<T> {
  items: T[]
  meta: PaginationMeta
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  name: string
  email: string
  phone?: string
  auth_provider: string
  role?: string
}

export interface LoginResponse {
  token: string
  user: AuthUser
}

export interface LoginPayload {
  email: string
  password: string
}

// ─── Sport ───────────────────────────────────────────────────────────────────

export interface Sport {
  id: string
  name_ar: string
  name_en: string
  image_url: string
  is_enabled: boolean
  is_available: boolean
}

export interface SportPayload {
  name_ar: string
  name_en: string
  image_url: string
  is_enabled: boolean
  is_available: boolean
}

// ─── Team ────────────────────────────────────────────────────────────────────

export interface Team {
  id: string
  name_ar: string
  name_en: string
  logo_url: string
}

export interface TeamPayload {
  name_ar: string
  name_en: string
  logo_url: string
}

// ─── Service ─────────────────────────────────────────────────────────────────

export interface Service {
  id: string
  name_ar: string
  name_en: string
  icon_code: string
}

export interface ServicePayload {
  name_ar: string
  name_en: string
  icon_code: string
}

// ─── Pitch ───────────────────────────────────────────────────────────────────

export interface Pitch {
  id: string
  name_ar: string
  name_en: string
  sport_id: string
  image_url: string
  address: string
  google_maps_url: string
  surface_type: string
  services?: Service[]
}

export interface PitchPayload {
  name_ar: string
  name_en: string
  sport_id: string
  image_url: string
  address: string
  google_maps_url: string
  surface_type: string
}

// ─── Cancellation Policy ─────────────────────────────────────────────────────

export interface CancellationPolicy {
  id: string
  name: string
  description_ar: string
  description_en: string
  cancel_before_hours: number
  is_default: boolean
}

export interface PolicyPayload {
  name: string
  description_ar: string
  description_en: string
  cancel_before_hours: number
  is_default: boolean
}

// ─── Match ───────────────────────────────────────────────────────────────────

export type MatchStatus = 'active' | 'cancelled' | 'completed'

export interface Match {
  id: string
  sport_id: string
  pitch_id: string
  date: string
  time: string
  players_format: string
  join_price: number
  status?: MatchStatus
  cancellation_policy_id?: string
  cancellation_policy?: CancellationPolicy
  sport?: Sport
  pitch?: Pitch
}

export interface MatchPayload {
  sport_id: string
  pitch_id: string
  date: string
  time: string
  players_format: string
  join_price: number
  cancellation_policy_id: string
  status?: MatchStatus
  service_ids?: string[]
}

// ─── Financial Transaction ───────────────────────────────────────────────────

export type TransactionStatus = 'pending' | 'completed' | 'failed'
export type PaymentSource = 'wallet' | 'card' | 'apple_pay'

export interface FinancialTransaction {
  id: string
  user_id: string
  match_id: string
  booking_id: string
  source: PaymentSource
  last_4_digits?: string
  amount: number
  transaction_id: string
  status: TransactionStatus
  created_at: string
  user?: {
    id: string
    name: string
    email: string
  }
}

export interface ManualRefundPayload {
  user_id: string
  amount: number
  description: string
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export interface ReportSummary {
  period: { from: string; to: string }
  summary: {
    total_revenue: number
    total_bookings: number
    new_users: number
    most_popular_pitch_id: string
    most_popular_pitch_name: string
    most_popular_pitch_bookings: number
  }
}

// ─── Upload ──────────────────────────────────────────────────────────────────

export interface UploadResponse {
  url: string
}

// ─── Admin User ───────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string
  name: string
  email: string
  phone: string
  role: 'player' | 'admin' | 'manager'
  gender: 'male' | 'female'
  auth_provider: string
  is_phone_verified: boolean
  is_email_verified: boolean
  created_at: string
}

export interface PlayerProfile {
  id: string
  sport_id: string
  total_points: number
  preferred_position?: string
  preferred_foot?: string
  shirt_number?: number
  shirt_size?: string
  shoe_size?: number
  level?: { id: string; name_ar: string; name_en: string; min_points: number; max_points: number }
  favorite_team?: { id: string; name_ar: string; name_en: string; logo_url: string }
  sport?: { id: string; name_ar: string; name_en: string }
}

export interface AdminUserDetail {
  user: AdminUser
  player_profiles: PlayerProfile[]
  total_points: number
  stats: {
    total_goals: number
    total_assists: number
    total_mvps: number
    total_matches: number
  }
}

export interface CreateAdminUserPayload {
  name: string
  email: string
  phone: string
  password: string
  role: 'player' | 'manager' | 'admin'
  gender: 'male' | 'female'
}

export interface AdjustPointsPayload {
  points: number
  description: string
}

// ─── Level ────────────────────────────────────────────────────────────────────

export interface Level {
  id: string
  name_ar: string
  name_en: string
  min_points: number
  max_points: number
}

export interface LevelPayload {
  name_ar: string
  name_en: string
  min_points: number
  max_points: number
}

// ─── Reward ───────────────────────────────────────────────────────────────────

export interface Reward {
  id: string
  name_ar: string
  name_en: string
  image_url: string
  required_points: number
}

export interface RewardPayload {
  name_ar: string
  name_en: string
  image_url: string
  required_points: number
}
