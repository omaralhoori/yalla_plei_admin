import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2 } from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import type {
  ApiResponse, MatchTemplate, MatchTemplatePayload,
  Sport, Pitch, CancellationPolicy, AdminUser, Service,
} from '@/types/api'

const EMPTY_ARRAY: never[] = []
const FORMATS = ['5v5', '6v6', '7v7', '8v8', '11v11']

const templateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sport_id: z.string().min(1, 'Sport is required'),
  pitch_id: z.string().min(1, 'Pitch is required'),
  duration: z.coerce.number().int('Must be a whole number').positive('Duration must be greater than 0'),
  players_format: z.string().min(1, 'Format is required'),
  join_price: z.coerce.number().positive('Price must be greater than 0'),
  cancellation_policy_id: z.string().min(1, 'Policy is required'),
  referee_id: z.string().optional(),
  registration_opens_hours_before: z.coerce.number().int('Must be a whole number').min(0, 'Cannot be negative'),
})

type TemplateFormValues = z.infer<typeof templateSchema>

export default function MatchTemplatesPage() {
  const qc = useQueryClient()
  const { toast } = useToast()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<MatchTemplate | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MatchTemplate | null>(null)
  const [featureServiceIds, setFeatureServiceIds] = useState<string[]>([])

  // ─── Queries ──────────────────────────────────────────────────────────────────

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['match-templates'],
    queryFn: async () => (await api.get<ApiResponse<MatchTemplate[]>>('/admin/match-templates')).data.data,
  })

  const { data: sports = [] } = useQuery({
    queryKey: ['sports'],
    queryFn: async () => (await api.get<ApiResponse<Sport[]>>('/sports')).data.data,
  })

  const { data: policies = [] } = useQuery({
    queryKey: ['policies'],
    queryFn: async () => (await api.get<ApiResponse<CancellationPolicy[]>>('/admin/policies')).data.data,
  })

  const { data: referees = [] } = useQuery({
    queryKey: ['users', { role: 'referee' }],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ items: AdminUser[] }>>('/admin/users?role=referee&limit=100&offset=0')
      return res.data.data.items
    },
  })

  // Show all services (both facility and feature types) as selectable add-ons
  const { data: features = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => (await api.get<ApiResponse<Service[]>>('/admin/services')).data.data,
  })

  // ─── Form ─────────────────────────────────────────────────────────────────────

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '', sport_id: '', pitch_id: '', duration: 90, players_format: '',
      join_price: 0, cancellation_policy_id: '', referee_id: '', registration_opens_hours_before: 0,
    },
  })

  const selectedSportId = useWatch({ control: form.control, name: 'sport_id', defaultValue: '' })

  // Pitches filtered by the selected sport
  const { data: formPitches = EMPTY_ARRAY } = useQuery({
    queryKey: ['pitches', { sport_id: selectedSportId }],
    queryFn: async () => (await api.get<ApiResponse<Pitch[]>>(`/pitches?sport_id=${selectedSportId}`)).data.data,
    enabled: !!selectedSportId,
  })

  // Fresh single-template fetch for the edit form (preloads services)
  const { data: freshTemplate } = useQuery({
    queryKey: ['match-template-detail', editTarget?.id],
    queryFn: async () => (await api.get<ApiResponse<MatchTemplate>>(`/admin/match-templates/${editTarget!.id}`)).data.data,
    enabled: !!editTarget?.id && sheetOpen,
  })

  useEffect(() => {
    if (!freshTemplate) return
    form.reset({
      name: freshTemplate.name,
      sport_id: freshTemplate.sport_id,
      pitch_id: freshTemplate.pitch_id,
      duration: freshTemplate.duration ?? 90,
      players_format: freshTemplate.players_format,
      join_price: freshTemplate.join_price,
      cancellation_policy_id: freshTemplate.cancellation_policy_id ?? '',
      referee_id: freshTemplate.referee_id ?? '',
      registration_opens_hours_before: freshTemplate.registration_opens_hours_before ?? 0,
    })
    setFeatureServiceIds(freshTemplate.services?.map(s => s.id) ?? [])
  }, [freshTemplate])

  // ─── Mutations ────────────────────────────────────────────────────────────────

  const saveServices = async (templateId: string) => {
    await api.put(`/admin/match-templates/${templateId}/services`, { service_ids: featureServiceIds })
  }

  const createMutation = useMutation({
    mutationFn: async (payload: MatchTemplatePayload) => {
      const res = await api.post<ApiResponse<MatchTemplate>>('/admin/match-templates', payload)
      await saveServices(res.data.data.id)
      return res
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['match-templates'] })
      toast({ title: 'Template created', variant: 'success' as never })
      setSheetOpen(false)
    },
    onError: () => toast({ title: 'Failed to create template', variant: 'destructive' }),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: MatchTemplatePayload }) => {
      const res = await api.put(`/admin/match-templates/${id}`, payload)
      await saveServices(id)
      return res
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['match-templates'] })
      toast({ title: 'Template updated', variant: 'success' as never })
      setSheetOpen(false)
    },
    onError: () => toast({ title: 'Failed to update template', variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/match-templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['match-templates'] })
      toast({ title: 'Template deleted', variant: 'success' as never })
      setDeleteTarget(null)
    },
    onError: () => toast({ title: 'Failed to delete template', variant: 'destructive' }),
  })

  // ─── Handlers ─────────────────────────────────────────────────────────────────

  function openCreate() {
    setEditTarget(null)
    form.reset({
      name: '', sport_id: '', pitch_id: '', duration: 90, players_format: '',
      join_price: 0, cancellation_policy_id: '', referee_id: '', registration_opens_hours_before: 0,
    })
    setFeatureServiceIds([])
    setSheetOpen(true)
  }

  function openEdit(tpl: MatchTemplate) {
    setEditTarget(tpl)
    form.reset({
      name: tpl.name,
      sport_id: tpl.sport_id,
      pitch_id: tpl.pitch_id,
      duration: tpl.duration ?? 90,
      players_format: tpl.players_format,
      join_price: tpl.join_price,
      cancellation_policy_id: tpl.cancellation_policy_id ?? '',
      referee_id: tpl.referee_id ?? '',
      registration_opens_hours_before: tpl.registration_opens_hours_before ?? 0,
    })
    setFeatureServiceIds(tpl.services?.map(s => s.id) ?? [])
    setSheetOpen(true)
  }

  function onSubmit(values: TemplateFormValues) {
    const payload: MatchTemplatePayload = {
      name: values.name,
      sport_id: values.sport_id,
      pitch_id: values.pitch_id,
      duration: values.duration,
      players_format: values.players_format,
      join_price: values.join_price,
      cancellation_policy_id: values.cancellation_policy_id,
      referee_id: values.referee_id || undefined,
      registration_opens_hours_before: values.registration_opens_hours_before,
    }
    if (editTarget) updateMutation.mutate({ id: editTarget.id, payload })
    else createMutation.mutate(payload)
  }

  function toggleFeature(id: string) {
    setFeatureServiceIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const isBusy = createMutation.isPending || updateMutation.isPending

  // ─── Table columns ────────────────────────────────────────────────────────────

  const columns: Column<MatchTemplate>[] = [
    { key: 'name', header: 'Name', cell: row => <span className="font-medium">{row.name}</span> },
    { key: 'pitch', header: 'Pitch', cell: row => <span className="text-sm">{row.pitch?.name_en ?? '—'}</span> },
    { key: 'sport', header: 'Sport', cell: row => <span className="text-sm text-muted-foreground">{row.sport?.name_en ?? '—'}</span> },
    { key: 'format', header: 'Format', cell: row => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.players_format}</code> },
    { key: 'duration', header: 'Duration', cell: row => <span className="text-sm text-muted-foreground">{row.duration ? `${row.duration} min` : '—'}</span> },
    { key: 'price', header: 'Price / Player', cell: row => <span className="font-medium">{formatCurrency(row.join_price)}</span> },
    {
      key: 'registration',
      header: 'Registration Opens',
      cell: row => (
        <span className="text-sm text-muted-foreground">
          {row.registration_opens_hours_before ? `${row.registration_opens_hours_before}h before` : 'Always open'}
        </span>
      ),
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
        title="Match Templates"
        subtitle="Reusable match presets — pick one when scheduling to pre-fill all details"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Template</Button>}
      />

      <DataTable
        columns={columns}
        data={templates}
        isLoading={isLoading}
        emptyMessage="No templates yet. Create one to speed up scheduling recurring matches."
      />

      {/* Create / Edit sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editTarget ? 'Edit Template' : 'Add Template'}</SheetTitle>
          </SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">

              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name</FormLabel>
                  <FormControl><Input placeholder="e.g. Tuesday Night 6v6" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="sport_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sport</FormLabel>
                  <Select
                    onValueChange={v => { field.onChange(v); form.setValue('pitch_id', '') }}
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

              <FormField control={form.control} name="pitch_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Pitch</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!selectedSportId}>
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

              <FormField control={form.control} name="duration" render={({ field }) => (
                <FormItem>
                  <FormLabel>Match Duration (minutes)</FormLabel>
                  <FormControl><Input type="number" min="1" step="1" placeholder="90" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="registration_opens_hours_before" render={({ field }) => (
                <FormItem>
                  <FormLabel>Registration Opens (hours before match)</FormLabel>
                  <FormControl><Input type="number" min="0" step="1" placeholder="0" {...field} /></FormControl>
                  <p className="text-xs text-muted-foreground">
                    How many hours before kickoff player registration opens. Set to 0 to keep it always open.
                  </p>
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
                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.cancel_before_hours}h)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="referee_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Referee (optional)</FormLabel>
                  <Select
                    onValueChange={v => field.onChange(v === '__none__' ? '' : v)}
                    value={field.value || '__none__'}
                  >
                    <FormControl><SelectTrigger><SelectValue placeholder="No referee" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">No referee</SelectItem>
                      {referees.map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.first_name} {r.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Feature services — copied to every match created from this template */}
              {features.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Match Features</Label>
                  <p className="text-xs text-muted-foreground -mt-1">
                    Feature add-ons copied to each match created from this template.
                  </p>
                  <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-muted/50">
                    {features.map(svc => (
                      <div key={svc.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`feat-${svc.id}`}
                          checked={featureServiceIds.includes(svc.id)}
                          onCheckedChange={() => toggleFeature(svc.id)}
                        />
                        <label htmlFor={`feat-${svc.id}`} className="text-sm cursor-pointer">{svc.name_en}</label>
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
        title="Delete Template"
        description={`Delete "${deleteTarget?.name}"? This won't affect matches already created from it.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
