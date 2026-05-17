import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Search, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import DataTable, { type Column } from '@/components/shared/DataTable'
import PageHeader from '@/components/shared/PageHeader'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import ImageUpload from '@/components/shared/ImageUpload'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'
import type { ApiResponse, Pitch, PitchPayload, Sport, Service } from '@/types/api'

const SURFACE_TYPES = ['artificial_grass', 'natural_grass', 'concrete', 'artificial']

const CITIES = ['Amman', 'Zarqa', 'Irbid', 'Aqaba', 'Madaba', 'Ajloun', 'Karak']

const pitchSchema = z.object({
  name_en: z.string().min(1, 'English name is required'),
  name_ar: z.string().min(1, 'Arabic name is required'),
  sport_id: z.string().min(1, 'Sport is required'),
  image_url: z.string().min(1, 'Image is required'),
  city: z.string().min(1, 'City is required'),
  address: z.string().min(1, 'Address is required'),
  google_maps_url: z.string().url('Must be a valid URL'),
  surface_type: z.string().min(1, 'Surface type is required'),
})

type PitchFormValues = z.infer<typeof pitchSchema>

export default function PitchesPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Pitch | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Pitch | null>(null)
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])

  // Filter state
  const [search, setSearch] = useState('')
  const [surfaceFilter, setSurfaceFilter] = useState('')
  const [applied, setApplied] = useState({ search: '', surface_type: '' })

  const { data: pitches = [], isLoading } = useQuery({
    queryKey: ['pitches', applied],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (applied.search) params.set('search', applied.search)
      if (applied.surface_type) params.set('surface_type', applied.surface_type)
      const qs = params.toString()
      const res = await api.get<ApiResponse<Pitch[]>>(`/pitches${qs ? `?${qs}` : ''}`)
      return res.data.data
    },
  })

  const { data: sports = [] } = useQuery({
    queryKey: ['sports'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Sport[]>>('/sports')
      return res.data.data
    },
  })

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Service[]>>('/admin/services')
      return res.data.data
    },
  })

  const form = useForm<PitchFormValues>({
    resolver: zodResolver(pitchSchema),
    defaultValues: { name_en: '', name_ar: '', sport_id: '', image_url: '', city: '', address: '', google_maps_url: '', surface_type: '' },
  })

  const savePitchAndServices = async (pitchId: string) => {
    if (selectedServiceIds.length > 0) {
      await api.put(`/admin/pitches/${pitchId}/services`, { service_ids: selectedServiceIds })
    }
  }

  const createMutation = useMutation({
    mutationFn: async (payload: PitchPayload) => {
      const res = await api.post<ApiResponse<Pitch>>('/admin/pitches', payload)
      await savePitchAndServices(res.data.data.id)
      return res
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pitches'] }); toast({ title: 'Pitch created', variant: 'success' as never }); setSheetOpen(false) },
    onError: () => toast({ title: 'Failed to create pitch', variant: 'destructive' }),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: PitchPayload }) => {
      const res = await api.put(`/admin/pitches/${id}`, payload)
      await savePitchAndServices(id)
      return res
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pitches'] }); toast({ title: 'Pitch updated', variant: 'success' as never }); setSheetOpen(false) },
    onError: () => toast({ title: 'Failed to update pitch', variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/pitches/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pitches'] }); toast({ title: 'Pitch deleted', variant: 'success' as never }); setDeleteTarget(null) },
    onError: () => toast({ title: 'Failed to delete pitch', variant: 'destructive' }),
  })

  function openCreate() {
    setEditTarget(null)
    setSelectedServiceIds([])
    form.reset()
    setSheetOpen(true)
  }

  function openEdit(pitch: Pitch) {
    setEditTarget(pitch)
    setSelectedServiceIds(pitch.services?.map(s => s.id) ?? [])
    form.reset({
      name_en: pitch.name_en,
      name_ar: pitch.name_ar,
      sport_id: pitch.sport_id,
      image_url: pitch.image_url,
      city: pitch.city,
      address: pitch.address,
      google_maps_url: pitch.google_maps_url,
      surface_type: pitch.surface_type,
    })
    setSheetOpen(true)
  }

  function onSubmit(values: PitchFormValues) {
    if (editTarget) updateMutation.mutate({ id: editTarget.id, payload: values })
    else createMutation.mutate(values)
  }

  function toggleService(id: string) {
    setSelectedServiceIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const isBusy = createMutation.isPending || updateMutation.isPending

  const columns: Column<Pitch>[] = [
    {
      key: 'image',
      header: 'Image',
      cell: row => row.image_url
        ? <img src={row.image_url} alt={row.name_en} className="w-10 h-10 rounded-md object-cover" />
        : <div className="w-10 h-10 rounded-md bg-muted" />,
    },
    { key: 'name_en', header: 'Name', cell: row => <span className="font-medium">{row.name_en}</span> },
    { key: 'city', header: 'City', cell: row => <span className="text-sm">{row.city}</span> },
    { key: 'address', header: 'Address', cell: row => <span className="text-muted-foreground text-sm truncate max-w-[200px] block">{row.address}</span> },
    { key: 'surface_type', header: 'Surface', cell: row => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.surface_type}</code> },
    {
      key: 'services',
      header: 'Services',
      cell: row => <span className="text-sm text-muted-foreground">{row.services?.length ?? 0} services</span>,
    },
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
      <PageHeader
        title="Pitches"
        subtitle="Manage sport venues and their amenities"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Pitch</Button>}
      />

      {/* Filter bar */}
      <div className="bg-white border rounded-lg p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="space-y-1 flex-1 min-w-[200px]">
          <Label>Search</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Pitch name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setApplied({ search, surface_type: surfaceFilter })}
              className="pl-8"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Surface Type</Label>
          <Select value={surfaceFilter} onValueChange={v => setSurfaceFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All surfaces" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All surfaces</SelectItem>
              {SURFACE_TYPES.map(t => (
                <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => setApplied({ search, surface_type: surfaceFilter })}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />Apply
        </Button>
      </div>

      <DataTable columns={columns} data={pitches} isLoading={isLoading} />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader><SheetTitle>{editTarget ? 'Edit Pitch' : 'Add Pitch'}</SheetTitle></SheetHeader>
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

              {services.length > 0 && (
                <div className="space-y-2">
                  <Label>Services</Label>
                  <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg">
                    {services.map(svc => (
                      <div key={svc.id} className="flex items-center gap-2">
                        <Checkbox
                          id={svc.id}
                          checked={selectedServiceIds.includes(svc.id)}
                          onCheckedChange={() => toggleService(svc.id)}
                        />
                        <label htmlFor={svc.id} className="text-sm cursor-pointer">{svc.name_en}</label>
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
        title="Delete Pitch"
        description={`Delete "${deleteTarget?.name_en}"?`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
