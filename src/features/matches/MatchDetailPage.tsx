import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft, Calendar, MapPin, Users, DollarSign,
  Clock, ShieldCheck, BarChart3, Film, Hourglass,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import DataTable, { type Column } from '@/components/shared/DataTable'
import StatusBadge from '@/components/shared/StatusBadge'
import ImageUpload from '@/components/shared/ImageUpload'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'
import { formatCurrency, formatDateTime, formatDate, matchApiToUtcIso, formatMatchEndTime } from '@/lib/utils'
import type { ApiResponse, PaginatedResponse, Match, AdminBooking, HighlightPayload, Sport, WaitlistEntry } from '@/types/api'

// ─── Highlight form schema (match_id injected at submit time, not in form) ────

const highlightSchema = z.object({
  sport_id: z.string().min(1, 'Sport is required'),
  media_url: z.string().url('Must be a valid URL'),
  thumbnail_url: z.string().optional(),
  description: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  show_from: z.string().optional(),
  show_to: z.string().optional(),
})
type HighlightFormValues = z.infer<typeof highlightSchema>

// ─── Slot helper ──────────────────────────────────────────────────────────────

function parseTotalSlots(format: string): number {
  const m = format?.match(/^(\d+)v(\d+)$/)
  return m ? parseInt(m[1]) + parseInt(m[2]) : 0
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface InfoTileProps { icon: React.ElementType; label: string; value: React.ReactNode; loading?: boolean }
function InfoTile({ icon: Icon, label, value, loading }: InfoTileProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        {loading ? <Skeleton className="h-4 w-24 mt-1" /> : <p className="text-sm font-medium">{value ?? '—'}</p>}
      </div>
    </div>
  )
}

interface SlotBadgeProps { count: number; label: string; color: string; bg: string }
function SlotBadge({ count, label, color, bg }: SlotBadgeProps) {
  return (
    <div className={`rounded-lg ${bg} px-4 py-3 text-center`}>
      <p className={`text-2xl font-bold ${color}`}>{count}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { toast } = useToast()
  const [highlightOpen, setHighlightOpen] = useState(false)

  // ─── Match ───────────────────────────────────────────────────────────────────

  const { data: match, isLoading: matchLoading } = useQuery({
    queryKey: ['match-detail', id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Match>>(`/admin/matches/${id}`)
      return res.data.data
    },
    enabled: !!id,
  })

  // ─── Bookings for this match ──────────────────────────────────────────────────

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['match-bookings', id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<PaginatedResponse<AdminBooking>>>(
        `/admin/bookings?match_id=${id}&limit=100&offset=0`
      )
      return res.data.data.items ?? []
    },
    enabled: !!id,
  })

  // ─── Waitlist for this match ──────────────────────────────────────────────────

  const { data: waitlist = [], isLoading: waitlistLoading } = useQuery({
    queryKey: ['match-waitlist', id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<WaitlistEntry[]>>(`/admin/matches/${id}/waitlist`)
      return res.data.data ?? []
    },
    enabled: !!id,
  })

  // ─── Sports (for highlight form) ─────────────────────────────────────────────

  const { data: sports = [] } = useQuery({
    queryKey: ['sports'],
    queryFn: async () => (await api.get<ApiResponse<Sport[]>>('/sports')).data.data,
  })

  // ─── Highlight form ───────────────────────────────────────────────────────────

  const highlightForm = useForm<HighlightFormValues>({
    resolver: zodResolver(highlightSchema),
    defaultValues: {
      sport_id: match?.sport_id ?? '',
      media_url: '',
      thumbnail_url: '',
      description: '',
      date: match?.date ?? '',
      show_from: '',
      show_to: '',
    },
  })

  const createHighlightMutation = useMutation({
    mutationFn: (payload: HighlightPayload) => api.post('/admin/highlights', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['highlights'] })
      toast({ title: 'Highlight added successfully', variant: 'success' as never })
      setHighlightOpen(false)
      highlightForm.reset()
    },
    onError: () => toast({ title: 'Failed to add highlight', variant: 'destructive' }),
  })

  function onHighlightSubmit(values: HighlightFormValues) {
    if (!id) return
    const payload: HighlightPayload = {
      match_id: id,
      sport_id: values.sport_id,
      media_url: values.media_url,
      thumbnail_url: values.thumbnail_url || undefined,
      description: values.description || undefined,
      date: values.date,
      show_from: values.show_from || undefined,
      show_to: values.show_to || undefined,
    }
    createHighlightMutation.mutate(payload)
  }

  function openHighlightSheet() {
    highlightForm.reset({
      sport_id: match?.sport_id ?? '',
      media_url: '',
      thumbnail_url: '',
      description: '',
      date: match?.date ?? '',
      show_from: '',
      show_to: '',
    })
    setHighlightOpen(true)
  }

  // ─── Derived stats ────────────────────────────────────────────────────────────

  const totalSlots = match ? parseTotalSlots(match.players_format) : 0
  const confirmedCount = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length
  const availableSlots = Math.max(0, totalSlots - confirmedCount)
  const matchIso = match ? matchApiToUtcIso(match.date ?? '', match.time ?? '') : ''

  // ─── Booking columns ──────────────────────────────────────────────────────────

  const bookingColumns: Column<AdminBooking>[] = [
    {
      key: 'player',
      header: 'Player',
      cell: row => (
        <div>
          <div className="font-medium text-sm">{row.player ? `${row.player.first_name} ${row.player.last_name}` : 'Unknown'}</div>
          <div className="text-xs text-muted-foreground">{row.player?.email}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: row => <StatusBadge status={row.status} />,
    },
    {
      key: 'amount',
      header: 'Price / Slot',
      cell: row => <span className="font-semibold text-sm">{formatCurrency(row.match?.join_price ?? match?.join_price ?? 0)}</span>,
    },
    {
      key: 'booked_at',
      header: 'Booked At',
      cell: row => <span className="text-sm text-muted-foreground">{formatDateTime(row.date_time)}</span>,
    },
  ]

  // ─── Waitlist columns ─────────────────────────────────────────────────────────

  const waitlistColumns: Column<WaitlistEntry>[] = [
    {
      key: 'position',
      header: '#',
      cell: row => <span className="font-semibold text-sm">{row.position}</span>,
    },
    {
      key: 'player',
      header: 'Player',
      cell: row => (
        <div className="font-medium text-sm">
          {row.player ? `${row.player.first_name} ${row.player.last_name}` : 'Unknown'}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: row => <StatusBadge status={row.status} />,
    },
    {
      key: 'joined_at',
      header: 'Joined Queue',
      cell: row => <span className="text-sm text-muted-foreground">{formatDateTime(row.created_at)}</span>,
    },
    {
      key: 'deadline',
      header: 'Offer Deadline',
      cell: row => row.status === 'offered' && row.expires_at
        ? <span className="text-sm font-medium text-amber-600">{formatDateTime(row.expires_at)}</span>
        : <span className="text-xs text-muted-foreground">—</span>,
    },
  ]

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/matches')}>
          <ArrowLeft className="w-4 h-4 mr-1" />Back
        </Button>
        <div className="flex-1">
          {matchLoading
            ? <Skeleton className="h-7 w-56" />
            : <h1 className="text-2xl font-bold">
                {match?.pitch?.name_en ?? 'Match'} — {matchIso ? formatDate(matchIso) : '—'}
              </h1>
          }
          <p className="text-muted-foreground text-sm">Match Details &amp; Registered Players</p>
        </div>
        <Button onClick={openHighlightSheet} className="gap-2" disabled={matchLoading}>
          <Film className="w-4 h-4" />
          Add Highlight
        </Button>
      </div>

      {/* Match details card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Match Information</CardTitle>
          {match?.status && <StatusBadge status={match.status} />}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            <InfoTile icon={Calendar} label="Date (local)" value={matchIso ? formatDate(matchIso) : '—'} loading={matchLoading} />
            <InfoTile icon={Clock} label="Start Time (local)" value={matchIso ? formatDateTime(matchIso).split(',')[1]?.trim() : '—'} loading={matchLoading} />
            <InfoTile icon={Clock} label="End Time (local)" value={matchIso && match?.duration ? formatMatchEndTime(matchIso, match.duration) : '—'} loading={matchLoading} />
            <InfoTile icon={BarChart3} label="Duration" value={match?.duration ? `${match.duration} min` : '—'} loading={matchLoading} />
            <InfoTile icon={MapPin} label="Pitch" value={match?.pitch?.name_en} loading={matchLoading} />
            <InfoTile icon={Users} label="Sport" value={match?.sport?.name_en} loading={matchLoading} />
            <InfoTile icon={BarChart3} label="Format" value={match?.players_format} loading={matchLoading} />
            <InfoTile icon={DollarSign} label="Price / Player" value={match ? formatCurrency(match.join_price) : undefined} loading={matchLoading} />
            <InfoTile icon={ShieldCheck} label="Cancellation Policy" value={match?.cancellation_policy?.name} loading={matchLoading} />
          </div>
        </CardContent>
      </Card>

      {/* Capacity stats */}
      {!matchLoading && totalSlots > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <SlotBadge count={confirmedCount} label="Booked Slots" color="text-emerald-600" bg="bg-emerald-50" />
          <SlotBadge count={availableSlots} label="Available Slots" color="text-blue-600" bg="bg-blue-50" />
          <SlotBadge count={totalSlots} label="Total Slots" color="text-slate-700" bg="bg-muted" />
        </div>
      )}

      {/* Registered players */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registered Players</CardTitle>
          <CardDescription>
            {bookingsLoading ? 'Loading…' : `${bookings.length} booking${bookings.length !== 1 ? 's' : ''} — ${confirmedCount} confirmed`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={bookingColumns}
            data={bookings}
            isLoading={bookingsLoading}
            emptyMessage="No players have booked this match yet."
          />
        </CardContent>
      </Card>

      {/* Waitlist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Hourglass className="w-4 h-4" />
            Waitlist
          </CardTitle>
          <CardDescription>
            {waitlistLoading
              ? 'Loading…'
              : waitlist.length === 0
                ? 'No players are waiting for a seat.'
                : `${waitlist.length} player${waitlist.length !== 1 ? 's' : ''} in queue — a freed seat is offered to position 1 first.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={waitlistColumns}
            data={waitlist}
            isLoading={waitlistLoading}
            emptyMessage="No one is on the waitlist for this match."
          />
        </CardContent>
      </Card>

      {/* Add Highlight sheet — match_id is injected at submit; not shown in the form */}
      <Sheet open={highlightOpen} onOpenChange={setHighlightOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Film className="w-4 h-4" />
              Add Highlight
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              For match: <strong>{match?.pitch?.name_en ?? '—'}</strong> on {matchIso ? formatDate(matchIso) : '—'}
            </p>
          </SheetHeader>

          <Form {...highlightForm}>
            <form onSubmit={highlightForm.handleSubmit(onHighlightSubmit)} className="mt-6 space-y-4">

              <FormField control={highlightForm.control} name="sport_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sport</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select sport" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {sports.map(s => <SelectItem key={s.id} value={s.id}>{s.name_en}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={highlightForm.control} name="media_url" render={({ field }) => (
                <FormItem>
                  <FormLabel>Media URL (video or image)</FormLabel>
                  <FormControl><Input type="url" placeholder="https://…" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={highlightForm.control} name="thumbnail_url" render={({ field }) => (
                <FormItem>
                  <FormLabel>Thumbnail</FormLabel>
                  <FormControl>
                    <ImageUpload value={field.value ?? ''} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={highlightForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Brief description…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={highlightForm.control} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Highlight Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={highlightForm.control} name="show_from" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Show From</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={highlightForm.control} name="show_to" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Show To</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <SheetFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setHighlightOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createHighlightMutation.isPending} className="gap-2">
                  <Film className="w-4 h-4" />
                  {createHighlightMutation.isPending ? 'Saving…' : 'Add Highlight'}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
