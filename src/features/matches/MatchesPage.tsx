import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, XCircle, RefreshCw, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import DataTable, { type Column } from '@/components/shared/DataTable'
import PageHeader from '@/components/shared/PageHeader'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import StatusBadge from '@/components/shared/StatusBadge'
import { useToast } from '@/hooks/use-toast'
import { usePagination } from '@/hooks/usePagination'
import { api } from '@/lib/api'
import {
  formatCurrency, formatDateTime,
  matchApiToUtcIso, localToUtcMatchParts,
  utcToLocalDate, utcToLocalTime,
} from '@/lib/utils'
import type { ApiResponse, PaginatedResponse, Match, MatchPayload, Sport, Pitch, CancellationPolicy } from '@/types/api'

const FORMATS = ['5v5', '6v6', '7v7', '8v8', '11v11']

const matchSchema = z.object({
  sport_id: z.string().min(1, 'Sport is required'),
  pitch_id: z.string().min(1, 'Pitch is required'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  duration: z.coerce.number().int('Must be a whole number').positive('Duration must be greater than 0'),
  players_format: z.string().min(1, 'Format is required'),
  join_price: z.coerce.number().positive('Price must be greater than 0'),
  cancellation_policy_id: z.string().min(1, 'Policy is required'),
})

type MatchFormValues = z.infer<typeof matchSchema>

export default function MatchesPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { offset, limit, goToNextPage, goToPrevPage, reset } = usePagination(20)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Match | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Match | null>(null)
  const [matchServiceIds, setMatchServiceIds] = useState<string[]>([])

  // Filter bar state
  const [sportFilter, setSportFilter] = useState('')
  const [pitchFilter, setPitchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [applied, setApplied] = useState({
    sport_id: '', pitch_id: '', status: '', date_from: '', date_to: '',
  })

  // ─── Queries ──────────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['admin-matches', offset, limit, applied],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (applied.sport_id) params.set('sport_id', applied.sport_id)
      if (applied.pitch_id) params.set('pitch_id', applied.pitch_id)
      if (applied.status) params.set('status', applied.status)
      if (applied.date_from) params.set('date_from', applied.date_from)
      if (applied.date_to) params.set('date_to', applied.date_to)
      const res = await api.get<ApiResponse<PaginatedResponse<Match>>>(`/admin/matches?${params}`)
      return res.data.data
    },
  })

  const { data: sports = [] } = useQuery({
    queryKey: ['sports'],
    queryFn: async () => (await api.get<ApiResponse<Sport[]>>('/sports')).data.data,
  })

  // All pitches for the filter bar
  const { data: allPitches = [] } = useQuery({
    queryKey: ['pitches'],
    queryFn: async () => (await api.get<ApiResponse<Pitch[]>>('/pitches')).data.data,
  })

  const { data: policies = [] } = useQuery({
    queryKey: ['policies'],
    queryFn: async () => (await api.get<ApiResponse<CancellationPolicy[]>>('/admin/policies')).data.data,
  })

  // ─── Form ─────────────────────────────────────────────────────────────────────

  const form = useForm<MatchFormValues>({
    resolver: zodResolver(matchSchema),
    defaultValues: {
      sport_id: '', pitch_id: '', date: '', time: '', duration: 90,
      players_format: '', join_price: 0, cancellation_policy_id: '',
    },
  })

  // Watch sport_id to filter pitches in the form dropdown
  const selectedSportId = form.watch('sport_id')
  const watchedPitchId = form.watch('pitch_id')

  // Fresh single-match fetch for the edit form — uses the new admin detail endpoint
  const { data: freshMatch } = useQuery({
    queryKey: ['match-detail', editTarget?.id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Match>>(`/admin/matches/${editTarget!.id}`)
      return res.data.data
    },
    enabled: !!editTarget?.id && sheetOpen,
  })

  // Repopulate the form once the fresh data arrives (handles ISO date/time from detail endpoint)
  useEffect(() => {
    if (!freshMatch) return
    const iso = matchApiToUtcIso(freshMatch.date ?? '', freshMatch.time ?? '')
    form.reset({
      sport_id: freshMatch.sport_id,
      pitch_id: freshMatch.pitch_id,
      date: iso ? utcToLocalDate(iso) : '',
      time: iso ? utcToLocalTime(iso) : '',
      duration: freshMatch.duration ?? 90,
      players_format: freshMatch.players_format,
      join_price: freshMatch.join_price,
      cancellation_policy_id: freshMatch.cancellation_policy_id ?? '',
    })
    if (freshMatch.pitch?.services) {
      setMatchServiceIds(freshMatch.pitch.services.map(s => s.id))
    }
  }, [freshMatch])

  // Pitches filtered by the selected sport — only fetched when a sport is selected
  const { data: formPitches = [] } = useQuery({
    queryKey: ['pitches', { sport_id: selectedSportId }],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Pitch[]>>(`/pitches?sport_id=${selectedSportId}`)
      return res.data.data
    },
    enabled: !!selectedSportId,
  })

  // Auto-populate services checklist from the selected pitch's defaults
  useEffect(() => {
    if (watchedPitchId) {
      const pitch = formPitches.find(p => p.id === watchedPitchId)
      setMatchServiceIds(pitch?.services?.map(s => s.id) ?? [])
    } else {
      setMatchServiceIds([])
    }
  }, [watchedPitchId, formPitches])

  // ─── Mutations ────────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (payload: MatchPayload) => api.post('/admin/matches', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-matches'] })
      toast({ title: 'Match scheduled', variant: 'success' as never })
      setSheetOpen(false)
    },
    onError: () => toast({ title: 'Failed to schedule match', variant: 'destructive' }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<MatchPayload> }) =>
      api.put(`/admin/matches/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-matches'] })
      toast({ title: 'Match updated', variant: 'success' as never })
      setSheetOpen(false)
    },
    onError: () => toast({ title: 'Failed to update match', variant: 'destructive' }),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.put(`/admin/matches/${id}`, { status: 'cancelled' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-matches'] })
      toast({ title: 'Match cancelled — refunds issued to all players', variant: 'success' as never })
      setCancelTarget(null)
    },
    onError: () => toast({ title: 'Failed to cancel match', variant: 'destructive' }),
  })

  // ─── Handlers ─────────────────────────────────────────────────────────────────

  function openCreate() {
    setEditTarget(null)
    form.reset({ sport_id: '', pitch_id: '', date: '', time: '', duration: 90, players_format: '', join_price: 0, cancellation_policy_id: '' })
    setMatchServiceIds([])
    setSheetOpen(true)
  }

  function openEdit(match: Match) {
    setEditTarget(match)
    const iso = matchApiToUtcIso(match.date ?? '', match.time ?? '')
    form.reset({
      sport_id: match.sport_id,
      pitch_id: match.pitch_id,
      date: iso ? utcToLocalDate(iso) : '',
      time: iso ? utcToLocalTime(iso) : '',
      duration: match.duration ?? 90,
      players_format: match.players_format,
      join_price: match.join_price,
      cancellation_policy_id: match.cancellation_policy_id ?? '',
    })
    setSheetOpen(true)
  }

  function onSubmit(values: MatchFormValues) {
    // Convert local date + time inputs to the UTC date (YYYY-MM-DD) and time (HH:MM:SS)
    // parts that the Match API expects — NOT full ISO strings.
    const { date: utcDate, time: utcTime } = localToUtcMatchParts(values.date, values.time)
    const payload: MatchPayload = {
      sport_id: values.sport_id,
      pitch_id: values.pitch_id,
      date: utcDate,
      time: utcTime,
      duration: values.duration,
      players_format: values.players_format,
      join_price: values.join_price,
      cancellation_policy_id: values.cancellation_policy_id,
      status: 'active',
      service_ids: matchServiceIds.length > 0 ? matchServiceIds : undefined,
    }
    if (editTarget) updateMutation.mutate({ id: editTarget.id, payload })
    else createMutation.mutate(payload)
  }

  function applyFilters() {
    reset()
    setApplied({ sport_id: sportFilter, pitch_id: pitchFilter, status: statusFilter, date_from: dateFrom, date_to: dateTo })
  }

  function toggleMatchService(id: string) {
    setMatchServiceIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const isBusy = createMutation.isPending || updateMutation.isPending
  const selectedPitch = formPitches.find(p => p.id === watchedPitchId) ?? null
  const pitchServices = selectedPitch?.services ?? []

  // ─── Table columns ────────────────────────────────────────────────────────────

  const columns: Column<Match>[] = [
    {
      key: 'datetime',
      header: 'Date / Time (Local)',
      cell: row => {
        const iso = matchApiToUtcIso(row.date ?? '', row.time ?? '')
        return <span className="text-sm">{iso ? formatDateTime(iso) : '—'}</span>
      },
    },
    {
      key: 'pitch',
      header: 'Pitch',
      cell: row => <span className="font-medium">{row.pitch?.name_en ?? '—'}</span>,
    },
    {
      key: 'sport',
      header: 'Sport',
      cell: row => <span className="text-sm text-muted-foreground">{row.sport?.name_en ?? '—'}</span>,
    },
    {
      key: 'format',
      header: 'Format',
      cell: row => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.players_format}</code>,
    },
    {
      key: 'duration',
      header: 'Duration',
      cell: row => <span className="text-sm text-muted-foreground">{row.duration ? `${row.duration} min` : '—'}</span>,
    },
    {
      key: 'price',
      header: 'Price / Player',
      cell: row => <span className="font-medium">{formatCurrency(row.join_price)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: row => <StatusBadge status={row.status ?? 'active'} />,
    },
    {
      key: 'actions',
      header: '',
      cell: row => (
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="outline" onClick={() => navigate(`/matches/${row.id}`)}>
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => openEdit(row)} disabled={row.status === 'cancelled'}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => setCancelTarget(row)} disabled={row.status === 'cancelled'}>
            <XCircle className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Matches"
        subtitle="Schedule and manage all matches"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Schedule Match</Button>}
      />

      {/* Filter bar */}
      <div className="bg-card border rounded-lg p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label>Sport</Label>
          <Select value={sportFilter} onValueChange={v => setSportFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All sports" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sports</SelectItem>
              {sports.map(s => <SelectItem key={s.id} value={s.id}>{s.name_en}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Pitch</Label>
          <Select value={pitchFilter} onValueChange={v => setPitchFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All pitches" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All pitches</SelectItem>
              {allPitches.map(p => <SelectItem key={p.id} value={p.id}>{p.name_en}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-36"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>From</Label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label>To</Label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
        </div>
        <Button onClick={applyFilters} className="gap-2">
          <RefreshCw className="w-4 h-4" />Apply
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        pagination={data ? {
          total: data.meta.total_count,
          limit,
          offset,
          onChange: o => o > offset ? goToNextPage() : goToPrevPage(),
        } : undefined}
        emptyMessage="No matches found for the selected filters."
      />

      {/* Create / Edit sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editTarget ? 'Edit Match' : 'Schedule Match'}</SheetTitle>
          </SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">

              {/* Sport — clearing pitch when sport changes */}
              <FormField control={form.control} name="sport_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sport</FormLabel>
                  <Select
                    onValueChange={v => {
                      field.onChange(v)
                      form.setValue('pitch_id', '')
                      setMatchServiceIds([])
                    }}
                    value={field.value}
                  >
                    <FormControl><SelectTrigger><SelectValue placeholder="Select sport" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {sports.map(s => <SelectItem key={s.id} value={s.id}>{s.name_en}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Pitch — filtered by selected sport, disabled until sport chosen */}
              <FormField control={form.control} name="pitch_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Pitch</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!selectedSportId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={selectedSportId ? 'Select pitch' : 'Select a sport first'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {formPitches.length === 0
                        ? <SelectItem value="_none" disabled>No pitches for this sport</SelectItem>
                        : formPitches.map(p => <SelectItem key={p.id} value={p.id}>{p.name_en}</SelectItem>)
                      }
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Services checklist — pre-populated from pitch defaults, fully toggleable */}
              {pitchServices.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Services for this match</Label>
                  <p className="text-xs text-muted-foreground -mt-1">
                    Pre-filled from pitch defaults. Toggle to override per-match.
                  </p>
                  <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-muted/50">
                    {pitchServices.map(svc => (
                      <div key={svc.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`msvc-${svc.id}`}
                          checked={matchServiceIds.includes(svc.id)}
                          onCheckedChange={() => toggleMatchService(svc.id)}
                        />
                        <label htmlFor={`msvc-${svc.id}`} className="text-sm cursor-pointer">{svc.name_en}</label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Date + Time — local input, stored as UTC parts */}
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date (local)</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="time" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time (local)</FormLabel>
                    <FormControl><Input type="time" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Times are entered in your browser's local timezone and submitted as UTC.
              </p>

              <FormField control={form.control} name="duration" render={({ field }) => (
                <FormItem>
                  <FormLabel>Match Duration (minutes)</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" step="1" placeholder="90" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="players_format" render={({ field }) => (
                <FormItem>
                  <FormLabel>Players Format</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select format" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {FORMATS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="join_price" render={({ field }) => (
                <FormItem>
                  <FormLabel>Price per Player (JOD)</FormLabel>
                  <FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="cancellation_policy_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cancellation Policy</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select policy" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {policies.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.cancel_before_hours}h)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <SheetFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isBusy}>{isBusy ? 'Saving...' : 'Save'}</Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel Match"
        description="Cancel this match? All confirmed bookings will be refunded to player wallets automatically."
        confirmLabel="Yes, Cancel Match"
        onConfirm={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}
        onCancel={() => setCancelTarget(null)}
        isLoading={cancelMutation.isPending}
      />
    </div>
  )
}
