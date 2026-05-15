import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { formatCurrency } from '@/lib/utils'
import type { ApiResponse, PaginatedResponse, Match, MatchPayload, Sport, Pitch, CancellationPolicy } from '@/types/api'

const FORMATS = ['5v5', '6v6', '7v7', '8v8', '11v11']

const matchSchema = z.object({
  sport_id: z.string().min(1, 'Sport is required'),
  pitch_id: z.string().min(1, 'Pitch is required'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  players_format: z.string().min(1, 'Format is required'),
  join_price: z.coerce.number().positive('Price must be greater than 0'),
  cancellation_policy_id: z.string().min(1, 'Policy is required'),
})

type MatchFormValues = z.infer<typeof matchSchema>

export default function MatchesPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { offset, limit, goToNextPage, goToPrevPage } = usePagination(20)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Match | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Match | null>(null)
  const [sportFilter, setSportFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['matches', offset, limit, sportFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (sportFilter) params.set('sport_id', sportFilter)
      const res = await api.get<ApiResponse<PaginatedResponse<Match>>>(`/matches?${params}`)
      return res.data.data
    },
  })

  const { data: sports = [] } = useQuery({
    queryKey: ['sports'],
    queryFn: async () => (await api.get<ApiResponse<Sport[]>>('/sports')).data.data,
  })

  const { data: pitches = [] } = useQuery({
    queryKey: ['pitches'],
    queryFn: async () => (await api.get<ApiResponse<Pitch[]>>('/pitches')).data.data,
  })

  const { data: policies = [] } = useQuery({
    queryKey: ['policies'],
    queryFn: async () => (await api.get<ApiResponse<CancellationPolicy[]>>('/admin/policies')).data.data,
  })

  const form = useForm<MatchFormValues>({
    resolver: zodResolver(matchSchema),
    defaultValues: { sport_id: '', pitch_id: '', date: '', time: '', players_format: '', join_price: 0, cancellation_policy_id: '' },
  })

  const createMutation = useMutation({
    mutationFn: (payload: MatchPayload) => api.post('/admin/matches', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['matches'] }); toast({ title: 'Match scheduled', variant: 'success' as never }); setSheetOpen(false) },
    onError: () => toast({ title: 'Failed to schedule match', variant: 'destructive' }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<MatchPayload> }) =>
      api.put(`/admin/matches/${id}`, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['matches'] }); toast({ title: 'Match updated', variant: 'success' as never }); setSheetOpen(false) },
    onError: () => toast({ title: 'Failed to update match', variant: 'destructive' }),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.put(`/admin/matches/${id}`, { status: 'cancelled' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['matches'] }); toast({ title: 'Match cancelled. Refunds issued.', variant: 'success' as never }); setCancelTarget(null) },
    onError: () => toast({ title: 'Failed to cancel match', variant: 'destructive' }),
  })

  function openCreate() {
    setEditTarget(null)
    form.reset()
    setSheetOpen(true)
  }

  function openEdit(match: Match) {
    setEditTarget(match)
    form.reset({
      sport_id: match.sport_id,
      pitch_id: match.pitch_id,
      date: match.date?.split('T')[0] ?? match.date,
      time: match.time?.split('T')[1]?.slice(0, 5) ?? match.time?.slice(0, 5) ?? '',
      players_format: match.players_format,
      join_price: match.join_price,
      cancellation_policy_id: match.cancellation_policy_id ?? '',
    })
    setSheetOpen(true)
  }

  function onSubmit(values: MatchFormValues) {
    const payload: MatchPayload = {
      ...values,
      date: new Date(values.date).toISOString(),
      time: new Date(`${values.date}T${values.time}`).toISOString(),
      status: 'active',
    }
    if (editTarget) updateMutation.mutate({ id: editTarget.id, payload })
    else createMutation.mutate(payload)
  }

  const isBusy = createMutation.isPending || updateMutation.isPending

  const columns: Column<Match>[] = [
    { key: 'date', header: 'Date', cell: row => <span>{row.date?.split('T')[0] ?? row.date}</span> },
    { key: 'time', header: 'Time', cell: row => <span>{row.time?.slice(0, 5) ?? '—'}</span> },
    { key: 'pitch', header: 'Pitch', cell: row => <span className="font-medium">{row.pitch?.name_en ?? '—'}</span> },
    { key: 'format', header: 'Format', cell: row => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.players_format}</code> },
    { key: 'price', header: 'Price', cell: row => <span>{formatCurrency(row.join_price)}</span> },
    { key: 'status', header: 'Status', cell: row => <StatusBadge status={row.status ?? 'active'} /> },
    {
      key: 'actions',
      header: '',
      cell: row => (
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="outline" onClick={() => openEdit(row)} disabled={row.status === 'cancelled'}><Pencil className="w-3.5 h-3.5" /></Button>
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
        subtitle="Schedule and manage matches"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Schedule Match</Button>}
      />

      <div className="mb-4 flex gap-3">
        <Select value={sportFilter} onValueChange={v => setSportFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-48 bg-white"><SelectValue placeholder="All sports" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sports</SelectItem>
            {sports.map(s => <SelectItem key={s.id} value={s.id}>{s.name_en}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        pagination={data ? { total: data.meta.total_count, limit, offset, onChange: o => o > offset ? goToNextPage() : goToPrevPage() } : undefined}
      />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader><SheetTitle>{editTarget ? 'Edit Match' : 'Schedule Match'}</SheetTitle></SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
              <FormField control={form.control} name="sport_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sport</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select sport" /></SelectTrigger></FormControl>
                    <SelectContent>{sports.map(s => <SelectItem key={s.id} value={s.id}>{s.name_en}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="pitch_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Pitch</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select pitch" /></SelectTrigger></FormControl>
                    <SelectContent>{pitches.map(p => <SelectItem key={p.id} value={p.id}>{p.name_en}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="time" render={({ field }) => (
                  <FormItem><FormLabel>Time (UTC)</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="players_format" render={({ field }) => (
                <FormItem>
                  <FormLabel>Players Format</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select format" /></SelectTrigger></FormControl>
                    <SelectContent>{FORMATS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="join_price" render={({ field }) => (
                <FormItem><FormLabel>Price per Player (SAR)</FormLabel><FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="cancellation_policy_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cancellation Policy</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select policy" /></SelectTrigger></FormControl>
                    <SelectContent>{policies.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.cancel_before_hours}h)</SelectItem>)}</SelectContent>
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
        description={`Cancel this match on ${cancelTarget?.date?.split('T')[0]}? All confirmed bookings will be refunded to player wallets automatically.`}
        confirmLabel="Yes, Cancel Match"
        onConfirm={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}
        onCancel={() => setCancelTarget(null)}
        isLoading={cancelMutation.isPending}
      />
    </div>
  )
}
