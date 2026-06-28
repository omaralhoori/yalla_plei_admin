import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Search, RefreshCw, Star, CalendarClock, Ban, XCircle, Users, UserCog } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import DataTable, { type Column } from '@/components/shared/DataTable'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import ImageUpload from '@/components/shared/ImageUpload'
import { useToast } from '@/hooks/use-toast'
import { usePagination } from '@/hooks/usePagination'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import type {
  ApiResponse, PaginatedResponse, Sport, Service, CancellationPolicy, AdminUser,
  RentalPitch, RentalPitchPayload, RentalPitchAvailability,
  RentalBooking, BlockSlotPayload, CancelRentalBookingPayload,
} from '@/types/api'

const SURFACE_TYPES = ['artificial_grass', 'natural_grass', 'concrete', 'artificial']
const CITIES = ['Amman', 'Zarqa', 'Irbid', 'Aqaba', 'Madaba', 'Ajloun', 'Karak']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DURATION_OPTIONS = [60, 90, 120]

// ─── Rentable Pitches tab ─────────────────────────────────────────────────────

const rentalPitchSchema = z.object({
  name_en: z.string().min(1, 'English name is required'),
  name_ar: z.string().min(1, 'Arabic name is required'),
  sport_id: z.string().min(1, 'Sport is required'),
  image_url: z.string().min(1, 'Image is required'),
  city: z.string().min(1, 'City is required'),
  address: z.string().min(1, 'Address is required'),
  google_maps_url: z.string().url('Must be a valid URL'),
  surface_type: z.string().min(1, 'Surface type is required'),
  phone_number: z.string().optional(),
  max_players: z.preprocess(
    v => (v === '' || v == null ? undefined : v),
    z.coerce.number().int().positive('Must be greater than 0').optional(),
  ),
  latitude: z.preprocess(
    v => (v === '' || v == null ? undefined : v),
    z.coerce.number().min(-90, 'Must be ≥ -90').max(90, 'Must be ≤ 90').optional(),
  ),
  longitude: z.preprocess(
    v => (v === '' || v == null ? undefined : v),
    z.coerce.number().min(-180, 'Must be ≥ -180').max(180, 'Must be ≤ 180').optional(),
  ),
  price_per_hour: z.coerce.number().min(0, 'Must be 0 or more'),
  slot_minutes: z.coerce.number().int().positive('Must be greater than 0'),
  min_duration_minutes: z.coerce.number().int().positive('Must be greater than 0'),
  max_duration_minutes: z.coerce.number().int().positive('Must be greater than 0'),
  is_active: z.boolean(),
  manager_id: z.string().optional(),
  cancellation_policy_id: z.string().optional(),
}).refine(v => v.max_duration_minutes >= v.min_duration_minutes, {
  message: 'Max duration must be ≥ min duration',
  path: ['max_duration_minutes'],
})

type RentalPitchFormValues = z.infer<typeof rentalPitchSchema>

interface DaySchedule { enabled: boolean; open_time: string; close_time: string }

const DEFAULT_SCHEDULE: DaySchedule[] = WEEKDAYS.map(() => ({ enabled: false, open_time: '16:00', close_time: '23:00' }))

const DEFAULT_PITCH_VALUES: RentalPitchFormValues = {
  name_en: '', name_ar: '', sport_id: '', image_url: '', city: '', address: '',
  google_maps_url: '', surface_type: '', phone_number: '', max_players: undefined,
  latitude: undefined, longitude: undefined,
  price_per_hour: 30, slot_minutes: 30,
  min_duration_minutes: 60, max_duration_minutes: 120, is_active: true, manager_id: '', cancellation_policy_id: '',
}

const NO_POLICY = 'none'
const NO_MANAGER = 'unassigned'

function RatingStars({ rating }: { rating?: number }) {
  if (!rating) return <span className="text-xs text-muted-foreground">No ratings</span>
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
      {rating.toFixed(1)}
    </span>
  )
}

function RentalPitchesTab() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<RentalPitch | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RentalPitch | null>(null)
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE)

  const [search, setSearch] = useState('')
  const [applied, setApplied] = useState('')

  const { data: pitches = [], isLoading } = useQuery({
    queryKey: ['rental-pitches', applied],
    queryFn: async () => {
      const qs = applied ? `?search=${encodeURIComponent(applied)}` : ''
      const res = await api.get<ApiResponse<RentalPitch[]>>(`/admin/rental-pitches${qs}`)
      return res.data.data
    },
  })

  const { data: sports = [] } = useQuery({
    queryKey: ['sports'],
    queryFn: async () => (await api.get<ApiResponse<Sport[]>>('/sports')).data.data,
  })

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => (await api.get<ApiResponse<Service[]>>('/admin/services')).data.data,
  })

  const { data: policies = [] } = useQuery({
    queryKey: ['policies'],
    queryFn: async () => (await api.get<ApiResponse<CancellationPolicy[]>>('/admin/policies')).data.data,
  })

  const { data: managers = [] } = useQuery({
    queryKey: ['pitch-managers'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<PaginatedResponse<AdminUser>>>('/admin/users?role=pitch_manager&limit=100')
      return res.data.data.items ?? []
    },
  })

  const form = useForm<RentalPitchFormValues>({
    resolver: zodResolver(rentalPitchSchema),
    defaultValues: DEFAULT_PITCH_VALUES,
  })

  function buildPayload(values: RentalPitchFormValues): RentalPitchPayload {
    const availabilities: RentalPitchAvailability[] = schedule
      .map((d, day) => ({ ...d, day }))
      .filter(d => d.enabled)
      .map(d => ({ day_of_week: d.day, open_time: d.open_time, close_time: d.close_time }))
    return {
      ...values,
      phone_number: values.phone_number?.trim() || undefined,
      max_players: values.max_players ?? undefined,
      latitude: values.latitude ?? null,
      longitude: values.longitude ?? null,
      manager_id: values.manager_id || null,
      cancellation_policy_id: values.cancellation_policy_id || null,
      service_ids: selectedServiceIds,
      availabilities,
    }
  }

  const createMutation = useMutation({
    mutationFn: (payload: RentalPitchPayload) => api.post('/admin/rental-pitches', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rental-pitches'] }); toast({ title: 'Rental pitch created', variant: 'success' as never }); setSheetOpen(false) },
    onError: () => toast({ title: 'Failed to create rental pitch', variant: 'destructive' }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RentalPitchPayload }) => api.put(`/admin/rental-pitches/${id}`, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rental-pitches'] }); toast({ title: 'Rental pitch updated', variant: 'success' as never }); setSheetOpen(false) },
    onError: () => toast({ title: 'Failed to update rental pitch', variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/rental-pitches/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rental-pitches'] }); toast({ title: 'Rental pitch deleted', variant: 'success' as never }); setDeleteTarget(null) },
    onError: () => toast({ title: 'Failed to delete rental pitch', variant: 'destructive' }),
  })

  function openCreate() {
    setEditTarget(null)
    setSelectedServiceIds([])
    setSchedule(DEFAULT_SCHEDULE.map(d => ({ ...d })))
    form.reset(DEFAULT_PITCH_VALUES)
    setSheetOpen(true)
  }

  function openEdit(p: RentalPitch) {
    setEditTarget(p)
    setSelectedServiceIds(p.services?.map(s => s.id) ?? [])
    const next = DEFAULT_SCHEDULE.map(d => ({ ...d }))
    ;(p.availabilities ?? []).forEach(a => {
      if (a.day_of_week >= 0 && a.day_of_week <= 6) {
        next[a.day_of_week] = { enabled: true, open_time: a.open_time?.slice(0, 5) || '16:00', close_time: a.close_time?.slice(0, 5) || '23:00' }
      }
    })
    setSchedule(next)
    form.reset({
      name_en: p.name_en, name_ar: p.name_ar, sport_id: p.sport_id, image_url: p.image_url,
      city: p.city, address: p.address, google_maps_url: p.google_maps_url, surface_type: p.surface_type,
      phone_number: p.phone_number ?? '', max_players: p.max_players,
      latitude: p.latitude ?? undefined, longitude: p.longitude ?? undefined,
      price_per_hour: p.price_per_hour, slot_minutes: p.slot_minutes,
      min_duration_minutes: p.min_duration_minutes, max_duration_minutes: p.max_duration_minutes,
      is_active: p.is_active, manager_id: p.manager_id ?? '', cancellation_policy_id: p.cancellation_policy_id ?? '',
    })
    setSheetOpen(true)
  }

  function onSubmit(values: RentalPitchFormValues) {
    const payload = buildPayload(values)
    if (editTarget) updateMutation.mutate({ id: editTarget.id, payload })
    else createMutation.mutate(payload)
  }

  function toggleService(id: string) {
    setSelectedServiceIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  function updateDay(index: number, patch: Partial<DaySchedule>) {
    setSchedule(prev => prev.map((d, i) => i === index ? { ...d, ...patch } : d))
  }

  const isBusy = createMutation.isPending || updateMutation.isPending

  const columns: Column<RentalPitch>[] = [
    {
      key: 'image',
      header: 'Image',
      cell: row => row.image_url
        ? <img src={row.image_url} alt={row.name_en} className="w-10 h-10 rounded-md object-cover" />
        : <div className="w-10 h-10 rounded-md bg-muted" />,
    },
    {
      key: 'name',
      header: 'Name',
      cell: row => (
        <div>
          <div className="font-medium">{row.name_en}</div>
          <div className="text-xs text-muted-foreground">{row.city}</div>
          {row.phone_number && (
            <a href={`tel:${row.phone_number}`} className="text-xs text-primary hover:underline" dir="ltr">{row.phone_number}</a>
          )}
        </div>
      ),
    },
    { key: 'price', header: 'Price / Hour', cell: row => <span className="font-semibold text-sm">{formatCurrency(row.price_per_hour)}</span> },
    {
      key: 'duration',
      header: 'Duration / Capacity',
      cell: row => (
        <div className="text-xs text-muted-foreground">
          <div>{row.min_duration_minutes}–{row.max_duration_minutes} min · {row.slot_minutes}m slots</div>
          {row.max_players ? <div className="inline-flex items-center gap-1 mt-0.5"><Users className="w-3 h-3" />{row.max_players} players</div> : null}
        </div>
      ),
    },
    { key: 'rating', header: 'Rating', cell: row => <RatingStars rating={row.rating} /> },
    {
      key: 'manager',
      header: 'Manager',
      cell: row => row.manager
        ? <span className="inline-flex items-center gap-1 text-sm"><UserCog className="w-3.5 h-3.5 text-amber-600" />{row.manager.first_name} {row.manager.last_name}</span>
        : <span className="text-xs text-muted-foreground">Unassigned</span>,
    },
    { key: 'bookings', header: 'Bookings', cell: row => <span className="text-sm">{row.booking_count ?? 0}</span> },
    { key: 'active', header: 'Status', cell: row => <Badge variant={row.is_active ? 'success' : 'secondary'}>{row.is_active ? 'Active' : 'Inactive'}</Badge> },
    {
      key: 'actions',
      header: '',
      cell: row => (
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="outline" onClick={() => openEdit(row)}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => setDeleteTarget(row)}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="bg-card border rounded-lg p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="space-y-1 flex-1 min-w-[200px]">
          <Label>Search</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Pitch name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setApplied(search)}
              className="pl-8"
            />
          </div>
        </div>
        <Button onClick={() => setApplied(search)} variant="outline" className="gap-2"><RefreshCw className="w-4 h-4" />Apply</Button>
        <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" />Add Rental Pitch</Button>
      </div>

      <DataTable columns={columns} data={pitches} isLoading={isLoading} emptyMessage="No rentable pitches yet." />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader><SheetTitle>{editTarget ? 'Edit Rental Pitch' : 'Add Rental Pitch'}</SheetTitle></SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
              <FormField control={form.control} name="name_en" render={({ field }) => (
                <FormItem><FormLabel>Name (English)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="name_ar" render={({ field }) => (
                <FormItem><FormLabel>Name (Arabic)</FormLabel><FormControl><Input dir="rtl" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
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
              <FormField control={form.control} name="image_url" render={({ field }) => (
                <FormItem><FormLabel>Image</FormLabel><FormControl><ImageUpload value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger></FormControl>
                    <SelectContent>{CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="google_maps_url" render={({ field }) => (
                <FormItem><FormLabel>Google Maps URL</FormLabel><FormControl><Input type="url" placeholder="https://maps.google.com/..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="latitude" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        dir="ltr"
                        placeholder="e.g. 31.9539"
                        value={field.value ?? ''}
                        onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="longitude" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        dir="ltr"
                        placeholder="e.g. 35.9106"
                        value={field.value ?? ''}
                        onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <p className="col-span-2 text-xs text-muted-foreground -mt-1">Optional decimal coordinates — lets players sort pitches by distance from their location.</p>
              </div>
              <FormField control={form.control} name="surface_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Surface Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select surface" /></SelectTrigger></FormControl>
                    <SelectContent>{SURFACE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="phone_number" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl><Input type="tel" dir="ltr" placeholder="+962790000000" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="max_players" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Players (capacity)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="e.g. 14"
                        value={field.value ?? ''}
                        onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Pricing & slotting */}
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="price_per_hour" render={({ field }) => (
                  <FormItem><FormLabel>Price / Hour (JOD)</FormLabel><FormControl><Input type="number" min="0" step="0.5" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="slot_minutes" render={({ field }) => (
                  <FormItem><FormLabel>Slot (minutes)</FormLabel><FormControl><Input type="number" min="1" step="1" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="min_duration_minutes" render={({ field }) => (
                  <FormItem><FormLabel>Min Duration (min)</FormLabel><FormControl><Input type="number" min="1" step="1" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="max_duration_minutes" render={({ field }) => (
                  <FormItem><FormLabel>Max Duration (min)</FormLabel><FormControl><Input type="number" min="1" step="1" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <FormField control={form.control} name="cancellation_policy_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cancellation Policy</FormLabel>
                  <Select onValueChange={v => field.onChange(v === NO_POLICY ? '' : v)} value={field.value || NO_POLICY}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Default policy" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value={NO_POLICY}>Default policy</SelectItem>
                      {policies.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="manager_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Pitch Manager</FormLabel>
                  <Select onValueChange={v => field.onChange(v === NO_MANAGER ? '' : v)} value={field.value || NO_MANAGER}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value={NO_MANAGER}>Unassigned</SelectItem>
                      {managers.map(m => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name} — {m.email}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Delegate this pitch to a pitch-manager account (they manage its bookings and blocks).</p>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="is_active" render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="!mt-0">Active (bookable by players)</FormLabel>
                </FormItem>
              )} />

              {/* Weekly schedule */}
              <div className="space-y-2">
                <Label>Weekly Opening Hours</Label>
                <p className="text-xs text-muted-foreground">Toggle a day on and set its opening window. Days left off are closed.</p>
                <div className="space-y-2 rounded-lg border p-3">
                  {schedule.map((day, i) => (
                    <div key={WEEKDAYS[i]} className="flex items-center gap-2">
                      <div className="flex items-center gap-2 w-32 shrink-0">
                        <Switch checked={day.enabled} onCheckedChange={v => updateDay(i, { enabled: v })} />
                        <span className="text-sm">{WEEKDAYS[i]}</span>
                      </div>
                      <Input
                        type="time"
                        value={day.open_time}
                        disabled={!day.enabled}
                        onChange={e => updateDay(i, { open_time: e.target.value })}
                        className="flex-1"
                      />
                      <span className="text-muted-foreground text-xs">to</span>
                      <Input
                        type="time"
                        value={day.close_time}
                        disabled={!day.enabled}
                        onChange={e => updateDay(i, { close_time: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {services.length > 0 && (
                <div className="space-y-2">
                  <Label>Facilities</Label>
                  <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg">
                    {services.map(svc => (
                      <div key={svc.id} className="flex items-center gap-2">
                        <Checkbox id={`svc-${svc.id}`} checked={selectedServiceIds.includes(svc.id)} onCheckedChange={() => toggleService(svc.id)} />
                        <label htmlFor={`svc-${svc.id}`} className="text-sm cursor-pointer">{svc.name_en}</label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <SheetFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isBusy}>{isBusy ? 'Saving...' : 'Save'}</Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Rental Pitch"
        description={`Delete "${deleteTarget?.name_en}"? This cannot be undone.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

// ─── Rental Bookings tab ──────────────────────────────────────────────────────

function RentalBookingsTab() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { offset, limit, goToNextPage, goToPrevPage, reset } = usePagination(20)

  const [pitchFilter, setPitchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [applied, setApplied] = useState({ rental_pitch_id: '', status: '', date_from: '', date_to: '' })

  const [cancelTarget, setCancelTarget] = useState<RentalBooking | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [blockOpen, setBlockOpen] = useState(false)

  const { data: pitches = [] } = useQuery({
    queryKey: ['rental-pitches', ''],
    queryFn: async () => (await api.get<ApiResponse<RentalPitch[]>>('/admin/rental-pitches')).data.data,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['rental-bookings', offset, limit, applied],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (applied.rental_pitch_id) params.set('rental_pitch_id', applied.rental_pitch_id)
      if (applied.status) params.set('status', applied.status)
      if (applied.date_from) params.set('date_from', applied.date_from)
      if (applied.date_to) params.set('date_to', applied.date_to)
      const res = await api.get<ApiResponse<PaginatedResponse<RentalBooking>>>(`/admin/rental-bookings?${params}`)
      return res.data.data
    },
  })

  const cancelMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CancelRentalBookingPayload }) =>
      api.post(`/admin/rental-bookings/${id}/cancel`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rental-bookings'] })
      qc.invalidateQueries({ queryKey: ['rental-pitches'] })
      toast({ title: 'Rental booking cancelled', variant: 'success' as never })
      setCancelTarget(null)
    },
    onError: () => toast({ title: 'Failed to cancel rental booking', variant: 'destructive' }),
  })

  function applyFilters() {
    reset()
    setApplied({ rental_pitch_id: pitchFilter, status: statusFilter, date_from: dateFrom, date_to: dateTo })
  }

  function openCancel(b: RentalBooking) {
    setCancelTarget(b)
    setCancelReason('')
  }

  const bookings = data?.items ?? []

  const columns: Column<RentalBooking>[] = [
    {
      key: 'pitch',
      header: 'Pitch',
      cell: row => <span className="font-medium text-sm">{row.rental_pitch?.name_en ?? '—'}</span>,
    },
    {
      key: 'who',
      header: 'Booked By',
      cell: row => row.is_external ? (
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Ban className="w-3.5 h-3.5" />
          Blocked {row.note ? `— ${row.note}` : '(off-platform)'}
        </span>
      ) : (
        <div>
          <div className="font-medium text-sm">{row.player ? `${row.player.first_name} ${row.player.last_name}` : 'Player'}</div>
          {row.player?.phone && (
            <a href={`tel:${row.player.phone}`} className="text-xs text-primary hover:underline" dir="ltr">{row.player.phone}</a>
          )}
        </div>
      ),
    },
    {
      key: 'when',
      header: 'When',
      cell: row => (
        <div>
          <div className="text-sm">{formatDate(row.date)}</div>
          <div className="text-xs text-muted-foreground">
            {row.start_time?.slice(0, 5)}{row.end_time ? `–${row.end_time.slice(0, 5)}` : ''} · {row.duration_minutes} min
          </div>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      cell: row => row.is_external
        ? <span className="text-xs text-muted-foreground">—</span>
        : <span className="font-semibold text-sm">{formatCurrency(row.price ?? 0)}</span>,
    },
    { key: 'status', header: 'Status', cell: row => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: '',
      cell: row => row.status !== 'cancelled' ? (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs text-destructive hover:text-destructive"
          onClick={() => openCancel(row)}
        >
          <XCircle className="w-3.5 h-3.5" />
          {row.is_external ? 'Unblock' : 'Cancel'}
        </Button>
      ) : null,
    },
  ]

  return (
    <div>
      <div className="bg-card border rounded-lg p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label>Pitch</Label>
          <Select value={pitchFilter || 'all'} onValueChange={v => setPitchFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All pitches" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All pitches</SelectItem>
              {pitches.map(p => <SelectItem key={p.id} value={p.id}>{p.name_en}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={statusFilter || 'all'} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending_payment">Pending Payment</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
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
        <Button onClick={applyFilters} variant="outline" className="gap-2"><RefreshCw className="w-4 h-4" />Apply</Button>
        <Button onClick={() => setBlockOpen(true)} className="gap-2"><CalendarClock className="w-4 h-4" />Block a Slot</Button>
      </div>

      <DataTable
        columns={columns}
        data={bookings}
        isLoading={isLoading}
        pagination={data ? {
          total: data.meta.total_count,
          limit,
          offset,
          onChange: o => o > offset ? goToNextPage() : goToPrevPage(),
        } : undefined}
        emptyMessage="No rental bookings found for the selected filters."
      />

      <BlockSlotDialog open={blockOpen} onOpenChange={setBlockOpen} pitches={pitches} />

      {/* Cancel / unblock */}
      <Dialog open={!!cancelTarget} onOpenChange={open => !open && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{cancelTarget?.is_external ? 'Remove Block' : 'Cancel Rental Booking'}</DialogTitle>
            <DialogDescription>
              {cancelTarget?.is_external
                ? 'This frees the blocked slot so players can book it again.'
                : 'A confirmed, paid booking is fully refunded to the player\u2019s wallet and the player is notified.'}
            </DialogDescription>
          </DialogHeader>
          {!cancelTarget?.is_external && (
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Reason (optional)</Label>
              <Textarea
                id="cancel-reason"
                rows={3}
                placeholder="Shared with the player in the notification."
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)} disabled={cancelMutation.isPending}>Close</Button>
            <Button
              variant="destructive"
              disabled={cancelMutation.isPending}
              onClick={() => cancelTarget && cancelMutation.mutate({ id: cancelTarget.id, payload: { reason: cancelReason.trim() || undefined } })}
            >
              {cancelMutation.isPending ? 'Processing…' : cancelTarget?.is_external ? 'Remove Block' : 'Cancel & Refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Block slot dialog ────────────────────────────────────────────────────────

const blockSchema = z.object({
  rental_pitch_id: z.string().min(1, 'Pitch is required'),
  date: z.string().min(1, 'Date is required'),
  start_time: z.string().min(1, 'Start time is required'),
  duration_minutes: z.coerce.number().int().positive(),
  note: z.string().optional(),
})
type BlockFormValues = z.infer<typeof blockSchema>

function BlockSlotDialog({ open, onOpenChange, pitches }: { open: boolean; onOpenChange: (v: boolean) => void; pitches: RentalPitch[] }) {
  const qc = useQueryClient()
  const { toast } = useToast()

  const form = useForm<BlockFormValues>({
    resolver: zodResolver(blockSchema),
    defaultValues: { rental_pitch_id: '', date: '', start_time: '20:00', duration_minutes: 120, note: '' },
  })

  const blockMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: BlockSlotPayload }) =>
      api.post(`/admin/rental-pitches/${id}/block`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rental-bookings'] })
      toast({ title: 'Slot blocked', variant: 'success' as never })
      onOpenChange(false)
      form.reset()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast({ title: msg || 'Failed to block slot', variant: 'destructive' })
    },
  })

  function onSubmit(v: BlockFormValues) {
    blockMutation.mutate({
      id: v.rental_pitch_id,
      payload: { date: v.date, start_time: v.start_time, duration_minutes: v.duration_minutes, note: v.note || undefined },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Block a Slot</DialogTitle>
          <DialogDescription>
            Close a time block on a pitch (e.g. booked off-platform via WhatsApp) so players can&apos;t double-book it.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="rental_pitch_id" render={({ field }) => (
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
              <FormField control={form.control} name="start_time" render={({ field }) => (
                <FormItem><FormLabel>Start Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="duration_minutes" render={({ field }) => (
              <FormItem>
                <FormLabel>Duration</FormLabel>
                <Select onValueChange={v => field.onChange(Number(v))} value={String(field.value)}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {DURATION_OPTIONS.map(d => <SelectItem key={d} value={String(d)}>{d} minutes</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="note" render={({ field }) => (
              <FormItem><FormLabel>Note (optional)</FormLabel><FormControl><Input placeholder="e.g. Booked via WhatsApp" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={blockMutation.isPending} className="gap-1.5">
                <Ban className="w-4 h-4" />
                {blockMutation.isPending ? 'Blocking…' : 'Block Slot'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RentalsPage() {
  return (
    <div>
      <PageHeader title="Pitch Rental" subtitle="Manage rentable pitches, their schedules and pricing, and all rental bookings" />
      <Tabs defaultValue="pitches">
        <TabsList className="mb-4">
          <TabsTrigger value="pitches">Rentable Pitches</TabsTrigger>
          <TabsTrigger value="bookings">Rental Bookings</TabsTrigger>
        </TabsList>
        <TabsContent value="pitches"><RentalPitchesTab /></TabsContent>
        <TabsContent value="bookings"><RentalBookingsTab /></TabsContent>
      </Tabs>
    </div>
  )
}
