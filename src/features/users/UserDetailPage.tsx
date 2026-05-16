import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Target, Trophy, Users, Star, Sword, Wallet, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import StatusBadge from '@/components/shared/StatusBadge'
import type { ApiResponse, AdminUserDetail, AdjustPointsPayload, AdminBooking } from '@/types/api'

const adjustPointsSchema = z.object({
  points: z.coerce
    .number()
    .int('Must be a whole number')
    .refine(v => v !== 0, 'Points cannot be zero'),
  description: z.string().min(5, 'Provide a reason (min 5 characters)'),
})

type AdjustPointsValues = z.infer<typeof adjustPointsSchema>

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-blue-100 text-blue-700',
  player: 'bg-slate-100 text-slate-600',
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { toast } = useToast()
  const [adjustOpen, setAdjustOpen] = useState(false)

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
      const res = await api.get<ApiResponse<AdminBooking[]>>(`/admin/bookings?user_id=${id}&limit=10&offset=0`)
      return Array.isArray(res.data.data) ? res.data.data : []
    },
    enabled: !!id,
  })

  const form = useForm<AdjustPointsValues>({
    resolver: zodResolver(adjustPointsSchema),
    defaultValues: { points: 0, description: '' },
  })

  const adjustMutation = useMutation({
    mutationFn: (payload: AdjustPointsPayload) =>
      api.put(`/admin/users/${id}/points`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-detail', id] })
      toast({ title: 'Points adjusted successfully', variant: 'success' as never })
      setAdjustOpen(false)
      form.reset()
    },
    onError: () => toast({ title: 'Failed to adjust points', variant: 'destructive' }),
  })

  const user = data?.user
  const stats = data?.stats

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
            <h1 className="text-2xl font-bold">{user?.name}</h1>
          )}
          <p className="text-muted-foreground text-sm">User Profile &amp; Statistics</p>
        </div>
        <Button variant="outline" onClick={() => setAdjustOpen(true)} disabled={isLoading}>
          <Target className="w-4 h-4 mr-2" />Adjust Points
        </Button>
      </div>

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
              <InfoRow label="Email" value={user?.email} />
              <InfoRow label="Phone" value={user?.phone} />
              <InfoRow label="Gender" value={user?.gender} className="capitalize" />
              <InfoRow label="Auth Provider" value={user?.auth_provider} className="capitalize" />
              <InfoRow label="Joined" value={user?.created_at ? formatDate(user.created_at) : undefined} />
              <div>
                <p className="text-muted-foreground mb-1">Role</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${ROLE_BADGE[user?.role ?? 'player']}`}>
                  {user?.role}
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
        <StatCard icon={Trophy} label="Total Points" value={isLoading ? null : String(data?.total_points ?? 0)} color="text-amber-600" bg="bg-amber-50" />
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
                    <p className="text-muted-foreground text-xs mb-0.5">Points</p>
                    <p className="font-semibold text-amber-600">{profile.total_points.toLocaleString()}</p>
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
                      {b.match?.date ? formatDate(b.match.date) : '—'} · {formatDateTime(b.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={b.status} />
                    <span className="font-semibold text-sm">{formatCurrency(b.amount_paid)}</span>
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
            <DialogTitle>Adjust Loyalty Points</DialogTitle>
            <DialogDescription>
              Positive values award points; negative values deduct. The change is logged in the user&apos;s history.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(v => adjustMutation.mutate(v))} className="space-y-4 mt-2">
              <FormField control={form.control} name="points" render={({ field }) => (
                <FormItem>
                  <FormLabel>Points (+award / −deduct)</FormLabel>
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
