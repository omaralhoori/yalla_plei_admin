import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Target, Trophy, Users, Star, Sword, Wallet, ExternalLink, Pencil, Shield, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { getUser, isFullAdmin } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import StatusBadge from '@/components/shared/StatusBadge'
import SideBadge from '@/components/shared/SideBadge'
import type {
  ApiResponse, PaginatedResponse, AdminUserDetail, AdjustPointsPayload, AdminBooking, Sport,
  Country, City, UpdateAdminUserPayload, ChangeUserRolePayload, SetUserPasswordPayload, AdminUser,
} from '@/types/api'

const USER_ROLES = ['player', 'manager', 'admin', 'referee', 'pitch_manager'] as const
type UserRole = typeof USER_ROLES[number]

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  player: 'Player',
  referee: 'Referee',
  pitch_manager: 'Pitch Manager',
}

const adjustPointsSchema = z.object({
  sport_id: z.string().min(1, 'Sport is required'),
  points: z.coerce
    .number()
    .int('Must be a whole number')
    .refine(v => v !== 0, 'XP cannot be zero'),
  description: z.string().min(5, 'Provide a reason (min 5 characters)'),
})

type AdjustPointsValues = z.infer<typeof adjustPointsSchema>

const editProfileSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(7, 'Valid phone is required'),
  emergency_phone: z.string().optional(),
  gender: z.enum(['male', 'female']),
  date_of_birth: z.string().optional(),
  country_id: z.string().optional(),
  city_id: z.string().optional(),
  is_phone_verified: z.boolean(),
  is_email_verified: z.boolean(),
})
type EditProfileValues = z.infer<typeof editProfileSchema>

const changeRoleSchema = z.object({
  role: z.enum(USER_ROLES),
})
type ChangeRoleValues = z.infer<typeof changeRoleSchema>

const passwordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm: z.string().min(8, 'Confirm the password'),
}).refine(d => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })
type PasswordValues = z.infer<typeof passwordSchema>

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-blue-100 text-blue-700',
  player: 'bg-slate-100 text-slate-600',
  referee: 'bg-green-100 text-green-700',
  pitch_manager: 'bg-amber-100 text-amber-700',
}

function assignableRoles(isAdmin: boolean): UserRole[] {
  return isAdmin ? [...USER_ROLES] : USER_ROLES.filter(r => r !== 'admin')
}

function canManageUser(target: AdminUser | undefined): boolean {
  if (!target) return false
  return isFullAdmin() || target.role !== 'admin'
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { toast } = useToast()
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [roleOpen, setRoleOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)

  const currentUser = getUser()
  const fullAdmin = isFullAdmin()

  const { data, isLoading } = useQuery({
    queryKey: ['user-detail', id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<AdminUserDetail>>(`/admin/users/${id}`)
      return res.data.data
    },
    enabled: !!id,
  })

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['user-bookings', id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<PaginatedResponse<AdminBooking>>>(`/admin/bookings?user_id=${id}&limit=10&offset=0`)
      return res.data.data.items ?? []
    },
    enabled: !!id,
  })

  const { data: sports = [] } = useQuery({
    queryKey: ['sports'],
    queryFn: async () => (await api.get<ApiResponse<Sport[]>>('/sports')).data.data,
  })

  const { data: countries = [] } = useQuery({
    queryKey: ['countries'],
    queryFn: async () => (await api.get<ApiResponse<Country[]>>('/admin/countries')).data.data,
  })

  const form = useForm<AdjustPointsValues>({
    resolver: zodResolver(adjustPointsSchema),
    defaultValues: { sport_id: '', points: 0, description: '' },
  })

  const editForm = useForm<EditProfileValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      first_name: '', last_name: '', email: '', phone: '', emergency_phone: '',
      gender: 'male', date_of_birth: '', country_id: '', city_id: '',
      is_phone_verified: false, is_email_verified: false,
    },
  })

  const roleForm = useForm<ChangeRoleValues>({
    resolver: zodResolver(changeRoleSchema),
    defaultValues: { role: 'player' },
  })

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '', confirm: '' },
  })

  const watchedCountryId = editForm.watch('country_id')

  const { data: cities = [] } = useQuery({
    queryKey: ['cities', watchedCountryId],
    queryFn: async () =>
      (await api.get<ApiResponse<City[]>>(`/admin/countries/${watchedCountryId}/cities`)).data.data,
    enabled: !!watchedCountryId,
  })

  const adjustMutation = useMutation({
    mutationFn: (payload: AdjustPointsPayload) =>
      api.put(`/admin/users/${id}/points`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-detail', id] })
      toast({ title: 'XP adjusted successfully', variant: 'success' as never })
      setAdjustOpen(false)
      form.reset()
    },
    onError: () => toast({ title: 'Failed to adjust XP', variant: 'destructive' }),
  })

  const editMutation = useMutation({
    mutationFn: (payload: UpdateAdminUserPayload) => api.put(`/admin/users/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-detail', id] })
      qc.invalidateQueries({ queryKey: ['users'] })
      toast({ title: 'Profile updated', variant: 'success' as never })
      setEditOpen(false)
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      toast({ title: axiosErr?.response?.data?.error ?? 'Failed to update profile', variant: 'destructive' })
    },
  })

  const roleMutation = useMutation({
    mutationFn: (payload: ChangeUserRolePayload) => api.put(`/admin/users/${id}/role`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-detail', id] })
      qc.invalidateQueries({ queryKey: ['users'] })
      toast({ title: 'Role updated', variant: 'success' as never })
      setRoleOpen(false)
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      toast({ title: axiosErr?.response?.data?.error ?? 'Failed to update role', variant: 'destructive' })
    },
  })

  const passwordMutation = useMutation({
    mutationFn: (payload: SetUserPasswordPayload) => api.put(`/admin/users/${id}/password`, payload),
    onSuccess: () => {
      toast({ title: 'Password updated', variant: 'success' as never })
      setPasswordOpen(false)
      passwordForm.reset()
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      toast({ title: axiosErr?.response?.data?.error ?? 'Failed to reset password', variant: 'destructive' })
    },
  })

  const user = data?.user
  const stats = data?.stats
  const totalXp = data?.player_profiles?.reduce(
    (sum, p) => sum + (p.total_xp ?? p.total_points ?? 0),
    0,
  ) ?? data?.total_points ?? 0

  const manageable = canManageUser(user)
  const isSelf = currentUser?.id === id
  const canChangeRole = manageable && !isSelf

  function openEdit() {
    if (!user) return
    editForm.reset({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      emergency_phone: user.emergency_phone ?? '',
      gender: user.gender,
      date_of_birth: user.date_of_birth?.split('T')[0] ?? '',
      country_id: user.country_id ?? '',
      city_id: user.city_id ?? '',
      is_phone_verified: user.is_phone_verified,
      is_email_verified: user.is_email_verified,
    })
    setEditOpen(true)
  }

  function onEditSubmit(values: EditProfileValues) {
    const payload: UpdateAdminUserPayload = {
      first_name: values.first_name,
      last_name: values.last_name,
      email: values.email,
      phone: values.phone,
      gender: values.gender,
      emergency_phone: values.emergency_phone?.trim() || undefined,
      date_of_birth: values.date_of_birth || undefined,
      country_id: values.country_id || undefined,
      city_id: values.city_id || undefined,
      is_phone_verified: values.is_phone_verified,
      is_email_verified: values.is_email_verified,
    }
    editMutation.mutate(payload)
  }

  function openRole() {
    if (!user) return
    roleForm.reset({ role: user.role })
    setRoleOpen(true)
  }

  function onRoleSubmit(values: ChangeRoleValues) {
    roleMutation.mutate({ role: values.role })
  }

  function onPasswordSubmit(values: PasswordValues) {
    passwordMutation.mutate({ password: values.password })
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/users')}>
          <ArrowLeft className="w-4 h-4 mr-1" />Back
        </Button>
        <div className="flex-1">
          {isLoading ? (
            <Skeleton className="h-7 w-48" />
          ) : (
            <h1 className="text-2xl font-bold">{user?.first_name} {user?.last_name}</h1>
          )}
          <p className="text-muted-foreground text-sm">User Profile &amp; Statistics</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {manageable && (
            <>
              <Button variant="outline" size="sm" onClick={openEdit} disabled={isLoading}>
                <Pencil className="w-4 h-4 mr-2" />Edit Profile
              </Button>
              <Button variant="outline" size="sm" onClick={openRole} disabled={isLoading || !canChangeRole}>
                <Shield className="w-4 h-4 mr-2" />Change Role
              </Button>
              <Button variant="outline" size="sm" onClick={() => { passwordForm.reset(); setPasswordOpen(true) }} disabled={isLoading}>
                <KeyRound className="w-4 h-4 mr-2" />Reset Password
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => {
            const defaultSport = data?.player_profiles?.[0]?.sport_id ?? sports[0]?.id ?? ''
            form.reset({ sport_id: defaultSport, points: 0, description: '' })
            setAdjustOpen(true)
          }} disabled={isLoading}>
            <Target className="w-4 h-4 mr-2" />Adjust XP
          </Button>
        </div>
      </div>

      {!isLoading && user?.role === 'admin' && !fullAdmin && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Manager accounts cannot edit, change the role of, or reset the password for admin users.
        </div>
      )}

      {isSelf && manageable && (
        <div className="rounded-lg border border-muted bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          You cannot change your own role.
        </div>
      )}

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-4 w-full" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4 text-sm">
              <InfoRow label="First Name" value={user?.first_name} />
              <InfoRow label="Last Name" value={user?.last_name} />
              <InfoRow label="Email" value={user?.email} />
              <InfoRow label="Phone" value={user?.phone} />
              <InfoRow label="Emergency Phone" value={user?.emergency_phone} />
              <InfoRow label="Date of Birth" value={user?.date_of_birth ? formatDate(user.date_of_birth) : undefined} />
              <InfoRow label="Country" value={user?.country?.name_en} />
              <InfoRow label="City" value={user?.city?.name_en} />
              <InfoRow label="Gender" value={user?.gender} className="capitalize" />
              <InfoRow label="Auth Provider" value={user?.auth_provider} className="capitalize" />
              <InfoRow label="Joined" value={user?.created_at ? formatDate(user.created_at) : undefined} />
              <div>
                <p className="text-muted-foreground mb-1">Role</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_BADGE[user?.role ?? 'player']}`}>
                  {ROLE_LABEL[user?.role ?? 'player'] ?? user?.role}
                </span>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Verification</p>
                <div className="flex gap-1 flex-wrap">
                  {user?.is_email_verified && (
                    <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200">Email ✓</Badge>
                  )}
                  {user?.is_phone_verified && (
                    <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200">Phone ✓</Badge>
                  )}
                  {!user?.is_email_verified && !user?.is_phone_verified && (
                    <span className="text-muted-foreground">None</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Trophy} label="Total XP" value={isLoading ? null : String(totalXp)} color="text-violet-600" bg="bg-violet-50" />
        <StatCard icon={Wallet} label="Wallet" value={isLoading ? null : formatCurrency(data?.wallet_balance ?? 0)} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard icon={Users} label="Matches" value={isLoading ? null : String(stats?.total_matches ?? 0)} color="text-blue-600" bg="bg-blue-50" />
        <StatCard icon={Sword} label="Goals" value={isLoading ? null : String(stats?.total_goals ?? 0)} color="text-violet-600" bg="bg-violet-50" />
        <StatCard icon={Target} label="Assists" value={isLoading ? null : String(stats?.total_assists ?? 0)} color="text-purple-600" bg="bg-purple-50" />
        <StatCard icon={Star} label="MVPs" value={isLoading ? null : String(stats?.total_mvps ?? 0)} color="text-rose-600" bg="bg-rose-50" />
      </div>

      {/* Player profiles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Player Profiles</CardTitle>
          <CardDescription>Sport-specific profiles and level progression</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : data?.player_profiles && data.player_profiles.length > 0 ? (
            <div className="space-y-3">
              {data.player_profiles.map(profile => (
                <div key={profile.id} className="border rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-4 text-sm">
                  <InfoRow label="Sport" value={profile.sport?.name_en} />
                  <InfoRow label="Level" value={profile.level?.name_en} />
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Total XP</p>
                    <p className="font-semibold text-violet-600">{(profile.total_xp ?? profile.total_points ?? 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Monthly Pts</p>
                    <p className="font-semibold text-amber-600">{(profile.monthly_points ?? 0).toLocaleString()}</p>
                  </div>
                  <InfoRow label="Position" value={profile.preferred_position} className="capitalize" />
                  <InfoRow label="Preferred Foot" value={profile.preferred_foot} className="capitalize" />
                  <InfoRow label="Shirt #" value={profile.shirt_number !== undefined ? String(profile.shirt_number) : undefined} />
                  <InfoRow label="Shirt Size" value={profile.shirt_size} />
                  <InfoRow label="Favorite Team" value={profile.favorite_team?.name_en} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No player profiles configured yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Bookings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Recent Bookings</CardTitle>
            <CardDescription>Last 10 bookings by this user</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => navigate(`/financials?user_id=${id}`)}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Transactions
          </Button>
        </CardHeader>
        <CardContent>
          {bookingsLoading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : bookings.length === 0 ? (
            <p className="text-muted-foreground text-sm">No bookings found for this user.</p>
          ) : (
            <div className="divide-y">
              {bookings.map(b => (
                <div key={b.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{b.match?.pitch?.name_en ?? 'Unknown Pitch'}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.match?.date ? formatDate(b.match.date) : '—'} · {formatDateTime(b.date_time)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <SideBadge side={b.side} />
                    {b.is_goalkeeper && <Badge variant="secondary" className="text-xs">GK</Badge>}
                    <StatusBadge status={b.status} />
                    <span className="font-semibold text-sm">{formatCurrency(b.match?.join_price ?? 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Adjust Points dialog */}
      <Dialog open={adjustOpen} onOpenChange={open => { setAdjustOpen(open); if (!open) form.reset() }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust XP</DialogTitle>
            <DialogDescription>
              Manually add or deduct permanent XP for a specific sport. The player&apos;s level is re-evaluated automatically.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(v => adjustMutation.mutate(v))} className="space-y-4 mt-2">
              <FormField control={form.control} name="sport_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sport</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select sport" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sports.map(s => <SelectItem key={s.id} value={s.id}>{s.name_en}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="points" render={({ field }) => (
                <FormItem>
                  <FormLabel>XP (+award / −deduct)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 100 or -50" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Input placeholder="Bonus for referral campaign..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAdjustOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={adjustMutation.isPending}>
                  {adjustMutation.isPending ? 'Saving...' : 'Apply Adjustment'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit profile */}
      <Sheet open={editOpen} onOpenChange={open => { setEditOpen(open); if (!open) editForm.reset() }}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader><SheetTitle>Edit Profile</SheetTitle></SheetHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={editForm.control} name="first_name" render={({ field }) => (
                  <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={editForm.control} name="last_name" render={({ field }) => (
                  <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={editForm.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={editForm.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={editForm.control} name="emergency_phone" render={({ field }) => (
                <FormItem><FormLabel>Emergency Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={editForm.control} name="gender" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="date_of_birth" render={({ field }) => (
                  <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={editForm.control} name="country_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <Select
                      onValueChange={v => {
                        field.onChange(v === 'none' ? '' : v)
                        editForm.setValue('city_id', '')
                      }}
                      value={field.value || 'none'}
                    >
                      <FormControl><SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {countries.map(c => <SelectItem key={c.id} value={c.id}>{c.name_en}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="city_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <Select onValueChange={v => field.onChange(v === 'none' ? '' : v)} value={field.value || 'none'} disabled={!watchedCountryId}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name_en}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={editForm.control} name="is_email_verified" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="text-sm">Email verified</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <FormField control={editForm.control} name="is_phone_verified" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="text-sm">Phone verified</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <SheetFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={editMutation.isPending}>
                  {editMutation.isPending ? 'Saving…' : 'Save Changes'}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* Change role */}
      <Dialog open={roleOpen} onOpenChange={open => { setRoleOpen(open); if (!open) roleForm.reset() }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Updates permissions immediately. The user&apos;s next login will issue a JWT with the new role.
            </DialogDescription>
          </DialogHeader>
          <Form {...roleForm}>
            <form onSubmit={roleForm.handleSubmit(onRoleSubmit)} className="space-y-4 mt-2">
              <FormField control={roleForm.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {assignableRoles(fullAdmin).map(r => (
                        <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setRoleOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={roleMutation.isPending}>
                  {roleMutation.isPending ? 'Saving…' : 'Update Role'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Reset password */}
      <Dialog open={passwordOpen} onOpenChange={open => { setPasswordOpen(open); if (!open) passwordForm.reset() }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Sets a new local password. The user can sign in with email and this password afterward.
            </DialogDescription>
          </DialogHeader>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4 mt-2">
              <FormField control={passwordForm.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl><Input type="password" autoComplete="new-password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={passwordForm.control} name="confirm" render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl><Input type="password" autoComplete="new-password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPasswordOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={passwordMutation.isPending}>
                  {passwordMutation.isPending ? 'Saving…' : 'Set Password'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InfoRow({ label, value, className }: { label: string; value: string | undefined; className?: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs mb-0.5">{label}</p>
      <p className={`font-medium text-sm ${className ?? ''}`}>{value ?? '—'}</p>
    </div>
  )
}

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: string | null
  color: string
  bg: string
}

function StatCard({ icon: Icon, label, value, color, bg }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            {value === null
              ? <Skeleton className="h-5 w-10 mt-0.5" />
              : <p className="font-bold text-sm leading-none mt-0.5">{value}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
