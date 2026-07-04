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
  first_name: string
  last_name: string
  email: string
  phone?: string
  auth_provider: string
  role?: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
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

export type ServiceType = 'facility' | 'feature'

export interface Service {
  id: string
  name_ar: string
  name_en: string
  icon_code: string
  type: ServiceType
}

export interface ServicePayload {
  name_ar: string
  name_en: string
  icon_code: string
  type: ServiceType
}

// ─── Pitch ───────────────────────────────────────────────────────────────────

export interface Pitch {
  id: string
  name_ar: string
  name_en: string
  sport_id: string
  image_url: string
  city: string
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
  city: string
  address: string
  google_maps_url: string
  surface_type: string
}

// ─── Cancellation Policy ─────────────────────────────────────────────────────

export interface PolicyRefundTier {
  id?: string
  policy_id?: string
  hours_before: number
  refund_percent: number
}

export interface CancellationPolicy {
  id: string
  name: string
  description_ar: string
  description_en: string
  cancel_before_hours: number
  is_default: boolean
  refund_tiers?: PolicyRefundTier[]
}

export interface PolicyPayload {
  name: string
  description_ar: string
  description_en: string
  cancel_before_hours: number
  is_default: boolean
  refund_tiers: PolicyRefundTier[]
}

// ─── Match ───────────────────────────────────────────────────────────────────

export type MatchStatus = 'active' | 'cancelled' | 'completed'

export interface Match {
  id: string
  sport_id: string
  pitch_id: string
  date: string
  time: string
  duration: number
  players_format: string
  join_price: number
  status?: MatchStatus
  registration_opens_hours_before?: number
  cancellation_policy_id?: string
  cancellation_policy?: CancellationPolicy
  sport?: Sport
  pitch?: Pitch
  referee_id?: string
  referee?: { id: string; first_name: string; last_name: string }
}

export interface MatchPayload {
  sport_id: string
  pitch_id: string
  date: string
  time: string
  duration: number
  players_format: string
  join_price: number
  cancellation_policy_id: string
  status?: MatchStatus
  service_ids?: string[]
  referee_id?: string
  registration_opens_hours_before?: number
}

// ─── Match Template ──────────────────────────────────────────────────────────

export interface MatchTemplate {
  id: string
  name: string
  pitch_id: string
  sport_id: string
  duration: number
  players_format: string
  join_price: number
  cancellation_policy_id?: string
  referee_id?: string | null
  registration_opens_hours_before?: number
  created_at?: string
  updated_at?: string
  pitch?: Pitch
  sport?: Sport
  services?: Service[]
}

export interface MatchTemplatePayload {
  name: string
  pitch_id: string
  sport_id: string
  duration: number
  players_format: string
  join_price: number
  cancellation_policy_id?: string
  referee_id?: string
  registration_opens_hours_before?: number
}

export interface MatchFromTemplatePayload {
  template_id: string
  date: string
  time: string
  duration?: number
  players_format?: string
  join_price?: number
  referee_id?: string
  cancellation_policy_id?: string
  registration_opens_hours_before?: number
  status?: MatchStatus
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
  first_name: string
  last_name: string
  email: string
  phone: string
  emergency_phone?: string
  date_of_birth?: string
  role: 'player' | 'admin' | 'manager' | 'referee' | 'pitch_manager'
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
  wallet_balance?: number
  stats: {
    total_goals: number
    total_assists: number
    total_mvps: number
    total_matches: number
  }
}

export interface CreateAdminUserPayload {
  first_name: string
  last_name: string
  email: string
  phone: string
  password: string
  role: 'player' | 'manager' | 'admin' | 'referee' | 'pitch_manager'
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
  discount_percent: number
  benefits_ar: string
  benefits_en: string
  card_type: string
}

export interface LevelPayload {
  name_ar: string
  name_en: string
  min_points: number
  max_points: number
  discount_percent: number
  benefits_ar: string
  benefits_en: string
  card_type: string
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

// ─── Booking ──────────────────────────────────────────────────────────────────

export type BookingStatus = 'confirmed' | 'cancelled' | 'pending' | 'completed' | 'pending_payment' | 'pending_approval' | 'waitlist'

export interface AdminBooking {
  id: string
  player_id: string
  match_id: string
  pitch_id?: string
  status: BookingStatus
  date_time?: string
  goals_count?: number
  assists_count?: number
  is_mvp?: boolean
  attended?: boolean
  points_earned?: number
  player?: { id: string; first_name: string; last_name: string; email: string; phone?: string }
  match?: {
    id: string
    date: string
    time?: string
    join_price?: number
    sport?: Sport
    pitch?: Pitch
  }
}

export interface CancelBookingPayload {
  refund: boolean
}

export interface RejectBookingPayload {
  reason?: string
}

// ─── Waitlist ─────────────────────────────────────────────────────────────────

export type WaitlistStatus = 'waiting' | 'offered' | 'accepted' | 'expired' | 'cancelled'

export interface WaitlistEntry {
  id: string
  match_id: string
  player_id: string
  status: WaitlistStatus
  position: number
  offered_at?: string | null
  expires_at?: string | null
  created_at: string
  player?: { id: string; first_name: string; last_name: string; avatar_url?: string }
}

// ─── App Settings ─────────────────────────────────────────────────────────────

export interface AppSetting {
  key: string
  value: string
  updated_at?: string
}

// ─── Payment Receipts ─────────────────────────────────────────────────────────

export type ReceiptStatus = 'pending' | 'approved' | 'rejected'

export interface PaymentReceipt {
  id: string
  user_id: string
  amount: number
  image_url: string
  note?: string
  status: ReceiptStatus
  approved_amount?: number | null
  admin_note?: string
  reviewed_by?: string | null
  reviewed_at?: string | null
  created_at: string
  user?: { id: string; first_name: string; last_name: string; avatar_url?: string; email?: string }
}

export interface ApproveReceiptPayload {
  amount?: number
  note?: string
}

export interface RejectReceiptPayload {
  note?: string
}

// ─── Country & City ───────────────────────────────────────────────────────────

export interface Country {
  id: string
  name_ar: string
  name_en: string
  code?: string
  is_enabled: boolean
}

export interface CountryPayload {
  name_ar: string
  name_en: string
  code?: string
  is_enabled?: boolean
}

export interface City {
  id: string
  country_id: string
  name_ar: string
  name_en: string
  is_enabled: boolean
}

export interface CityPayload {
  country_id: string
  name_ar: string
  name_en: string
  is_enabled?: boolean
}

// ─── Point Rule ───────────────────────────────────────────────────────────────

export interface PointRule {
  key: string
  name_ar: string
  name_en: string
  points: number
  subscriber_points: number
  is_enabled: boolean
  updated_at?: string
}

export interface PointRulePayload {
  points?: number
  subscriber_points?: number
  is_enabled?: boolean
  name_ar?: string
  name_en?: string
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export type AuditAction = 'create' | 'update' | 'delete'

// The system/automated actor UUID — rendered as "system" by the API.
export const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000001'

export interface AuditLog {
  id: string
  table_name: string
  record_id: string
  action: AuditAction
  actor_id: string
  actor_name: string
  created_at: string
}

// ─── Highlight ────────────────────────────────────────────────────────────────

export interface Highlight {
  id: string
  match_id: string
  sport_id: string
  media_url: string
  thumbnail_url?: string
  description?: string
  date: string
  show_from?: string
  show_to?: string
  match?: { id: string; date: string; pitch?: Pitch }
  sport?: Sport
}

export interface HighlightPayload {
  match_id: string
  sport_id: string
  media_url: string
  thumbnail_url?: string
  description?: string
  date: string
  show_from?: string
  show_to?: string
}

// ─── Pitch Rental ─────────────────────────────────────────────────────────────

// day_of_week: 0 = Sunday … 6 = Saturday; times are "HH:MM"
export interface RentalPitchAvailability {
  id?: string
  rental_pitch_id?: string
  day_of_week: number
  open_time: string
  close_time: string
}

export interface RentalPitch {
  id: string
  name_ar: string
  name_en: string
  sport_id: string
  image_url: string
  city: string
  address: string
  google_maps_url: string
  surface_type: string
  phone_number?: string
  max_players?: number
  latitude?: number | null
  longitude?: number | null
  price_per_hour: number
  slot_minutes: number
  min_duration_minutes: number
  max_duration_minutes: number
  is_active: boolean
  manager_id?: string | null
  cancellation_policy_id?: string | null
  rating?: number
  booking_count?: number
  sport?: Sport
  services?: Service[]
  availabilities?: RentalPitchAvailability[]
  cancellation_policy?: CancellationPolicy
  manager?: { id: string; first_name: string; last_name: string; email?: string; phone?: string }
}

export interface RentalPitchPayload {
  name_ar: string
  name_en: string
  sport_id: string
  image_url: string
  city: string
  address: string
  google_maps_url: string
  surface_type: string
  phone_number?: string
  max_players?: number
  latitude?: number | null
  longitude?: number | null
  price_per_hour: number
  slot_minutes: number
  min_duration_minutes: number
  max_duration_minutes: number
  is_active: boolean
  manager_id?: string | null
  cancellation_policy_id?: string | null
  service_ids?: string[]
  availabilities?: RentalPitchAvailability[]
}

export type RentalBookingStatus = 'pending_payment' | 'confirmed' | 'cancelled'

export interface RentalBooking {
  id: string
  rental_pitch_id: string
  player_id?: string | null
  status: RentalBookingStatus
  is_external: boolean
  date: string
  start_time: string
  end_time?: string
  duration_minutes: number
  price?: number
  note?: string
  created_at: string
  rental_pitch?: RentalPitch
  player?: { id: string; first_name: string; last_name: string; email?: string; phone?: string }
}

export interface BlockSlotPayload {
  date: string
  start_time: string
  duration_minutes: number
  note?: string
}

export interface CancelRentalBookingPayload {
  reason?: string
}

// ─── Birthday Messages ────────────────────────────────────────────────────────

export interface BirthdayMessages {
  push_title: string
  push_body: string
  sms_message: string
}

export interface BirthdayMessagesPayload {
  push_title?: string
  push_body?: string
  sms_message?: string
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export type SubscriptionInterval = 'monthly' | 'annual'
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'pending'
export type SubscriptionProvider = 'hyperpay' | 'apple' | 'google'

export interface SubscriptionPlan {
  id: string
  code: string
  name_ar: string
  name_en: string
  interval: SubscriptionInterval
  price: number
  currency: string
  apple_product_id?: string
  google_product_id?: string
  is_active: boolean
  sort_order: number
}

export interface SubscriptionPlanPayload {
  code: string
  name_ar: string
  name_en: string
  interval: SubscriptionInterval
  price: number
  currency: string
  apple_product_id?: string
  google_product_id?: string
  is_active: boolean
  sort_order: number
}

export interface SubscriptionConfig {
  id?: string
  early_join_minutes: number
  theme: string
}

export interface SubscriptionConfigPayload {
  early_join_minutes?: number
  theme?: string
}

export interface PlayerSubscription {
  id: string
  user_id: string
  plan_id: string
  interval: SubscriptionInterval
  provider: SubscriptionProvider
  status: SubscriptionStatus
  current_period_start: string
  current_period_end: string
  auto_renew: boolean
  cancelled_at?: string | null
  plan?: SubscriptionPlan
  user?: { id: string; first_name: string; last_name: string; email?: string; phone?: string }
}

export interface SubscriptionsListResponse {
  subscriptions: PlayerSubscription[]
  total: number
}
