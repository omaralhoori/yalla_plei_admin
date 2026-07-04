import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import DataTable, { type Column } from '@/components/shared/DataTable'
import PageHeader from '@/components/shared/PageHeader'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import ImageUpload from '@/components/shared/ImageUpload'
import { useToast } from '@/hooks/use-toast'
import { usePagination } from '@/hooks/usePagination'
import { api } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import type { ApiResponse, PaginatedResponse, PromoItem, PromoItemPayload, PromoItemType } from '@/types/api'

const ALL = 'all'

const TYPE_LABELS: Record<PromoItemType, string> = {
  offer: 'Offer',
  announcement: 'Announcement',
  ad: 'Ad',
}

const TYPE_VARIANTS: Record<PromoItemType, 'success' | 'default' | 'secondary'> = {
  offer: 'success',
  announcement: 'default',
  ad: 'secondary',
}

const promoSchema = z.object({
  type: z.enum(['offer', 'announcement', 'ad']),
  image_url: z.string().min(1, 'Image is required'),
  title_en: z.string().min(1, 'English title is required'),
  title_ar: z.string().min(1, 'Arabic title is required'),
  short_description_en: z.string().optional(),
  short_description_ar: z.string().optional(),
  long_description_en: z.string().optional(),
  long_description_ar: z.string().optional(),
  is_active: z.boolean(),
  sort_order: z.coerce.number().int().min(0, 'Must be 0 or more'),
  show_from: z.string().optional(),
  show_to: z.string().optional(),
})

type PromoFormValues = z.infer<typeof promoSchema>

const DEFAULT_VALUES: PromoFormValues = {
  type: 'offer',
  image_url: '',
  title_en: '',
  title_ar: '',
  short_description_en: '',
  short_description_ar: '',
  long_description_en: '',
  long_description_ar: '',
  is_active: true,
  sort_order: 0,
  show_from: '',
  show_to: '',
}

function isoToDatetimeLocal(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function datetimeLocalToIso(local?: string): string | undefined {
  if (!local) return undefined
  const d = new Date(local)
  if (isNaN(d.getTime())) return undefined
  return d.toISOString()
}

interface AppliedFilters {
  type: string
  is_active: string
}

const EMPTY_FILTERS: AppliedFilters = { type: '', is_active: '' }

export default function PromoItemsPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { offset, limit, goToNextPage, goToPrevPage, reset } = usePagination(20)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<PromoItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PromoItem | null>(null)

  const [typeFilter, setTypeFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [applied, setApplied] = useState<AppliedFilters>(EMPTY_FILTERS)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['promo-items', offset, limit, applied],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (applied.type) params.set('type', applied.type)
      if (applied.is_active) params.set('is_active', applied.is_active)
      const res = await api.get<ApiResponse<PaginatedResponse<PromoItem>>>(`/admin/promo-items?${params}`)
      return res.data.data
    },
  })

  const form = useForm<PromoFormValues>({
    resolver: zodResolver(promoSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const createMutation = useMutation({
    mutationFn: (payload: PromoItemPayload) => api.post('/admin/promo-items', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promo-items'] })
      toast({ title: 'Promo item created', variant: 'success' as never })
      setSheetOpen(false)
    },
    onError: () => toast({ title: 'Failed to create promo item', variant: 'destructive' }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<PromoItemPayload> }) =>
      api.put(`/admin/promo-items/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promo-items'] })
      toast({ title: 'Promo item updated', variant: 'success' as never })
      setSheetOpen(false)
    },
    onError: () => toast({ title: 'Failed to update promo item', variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/promo-items/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promo-items'] })
      toast({ title: 'Promo item deleted', variant: 'success' as never })
      setDeleteTarget(null)
    },
    onError: () => toast({ title: 'Failed to delete promo item', variant: 'destructive' }),
  })

  function buildPayload(values: PromoFormValues): PromoItemPayload {
    return {
      type: values.type,
      image_url: values.image_url,
      title_en: values.title_en,
      title_ar: values.title_ar,
      short_description_en: values.short_description_en?.trim() || undefined,
      short_description_ar: values.short_description_ar?.trim() || undefined,
      long_description_en: values.long_description_en?.trim() || undefined,
      long_description_ar: values.long_description_ar?.trim() || undefined,
      is_active: values.is_active,
      sort_order: values.sort_order,
      show_from: datetimeLocalToIso(values.show_from),
      show_to: datetimeLocalToIso(values.show_to),
    }
  }

  function openCreate() {
    setEditTarget(null)
    form.reset(DEFAULT_VALUES)
    setSheetOpen(true)
  }

  function openEdit(item: PromoItem) {
    setEditTarget(item)
    form.reset({
      type: item.type,
      image_url: item.image_url,
      title_en: item.title_en,
      title_ar: item.title_ar,
      short_description_en: item.short_description_en ?? '',
      short_description_ar: item.short_description_ar ?? '',
      long_description_en: item.long_description_en ?? '',
      long_description_ar: item.long_description_ar ?? '',
      is_active: item.is_active,
      sort_order: item.sort_order,
      show_from: isoToDatetimeLocal(item.show_from),
      show_to: isoToDatetimeLocal(item.show_to),
    })
    setSheetOpen(true)
  }

  function onSubmit(values: PromoFormValues) {
    const payload = buildPayload(values)
    if (editTarget) updateMutation.mutate({ id: editTarget.id, payload })
    else createMutation.mutate(payload)
  }

  function applyFilters() {
    setApplied({ type: typeFilter, is_active: activeFilter })
    reset()
  }

  function clearFilters() {
    setTypeFilter('')
    setActiveFilter('')
    setApplied(EMPTY_FILTERS)
    reset()
  }

  const hasActiveFilters = !!(applied.type || applied.is_active)
  const isBusy = createMutation.isPending || updateMutation.isPending
  const items = data?.items ?? []

  const columns: Column<PromoItem>[] = [
    {
      key: 'image',
      header: 'Image',
      cell: row => row.image_url
        ? <img src={row.image_url} alt={row.title_en} className="w-16 h-10 rounded object-cover" />
        : <div className="w-16 h-10 rounded bg-muted" />,
    },
    {
      key: 'title',
      header: 'Title',
      cell: row => (
        <div>
          <p className="text-sm font-medium">{row.title_en}</p>
          <p className="text-xs text-muted-foreground truncate max-w-[200px]" dir="rtl">{row.title_ar}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      cell: row => (
        <Badge variant={TYPE_VARIANTS[row.type]} className="capitalize">
          {TYPE_LABELS[row.type]}
        </Badge>
      ),
    },
    {
      key: 'sort_order',
      header: 'Order',
      cell: row => <span className="text-sm tabular-nums">{row.sort_order}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: row => <Badge variant={row.is_active ? 'success' : 'secondary'}>{row.is_active ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'schedule',
      header: 'Schedule',
      cell: row => {
        if (!row.show_from && !row.show_to) {
          return <span className="text-sm text-muted-foreground">Always</span>
        }
        return (
          <div className="text-xs text-muted-foreground">
            {row.show_from && <div>From {formatDateTime(row.show_from)}</div>}
            {row.show_to && <div>To {formatDateTime(row.show_to)}</div>}
          </div>
        )
      },
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
        title="Promo Items"
        subtitle="Manage offers, announcements, and ads shown to players in the app"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Promo Item</Button>}
      />

      <div className="bg-card border rounded-lg p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label>Type</Label>
          <Select value={typeFilter || ALL} onValueChange={v => setTypeFilter(v === ALL ? '' : v)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All types</SelectItem>
              <SelectItem value="offer">Offer</SelectItem>
              <SelectItem value="announcement">Announcement</SelectItem>
              <SelectItem value="ad">Ad</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={activeFilter || ALL} onValueChange={v => setActiveFilter(v === ALL ? '' : v)}>
            <SelectTrigger className="w-36"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All</SelectItem>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={applyFilters} className="gap-2">
          <RefreshCw className="w-4 h-4" />Apply
        </Button>
        {hasActiveFilters && (
          <Button variant="outline" onClick={clearFilters} className="gap-2">
            <X className="w-4 h-4" />Clear
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading || isFetching}
        pagination={data ? {
          total: data.meta.total_count,
          limit,
          offset,
          onChange: o => (o > offset ? goToNextPage() : goToPrevPage()),
        } : undefined}
        emptyMessage="No promo items found."
      />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader><SheetTitle>{editTarget ? 'Edit Promo Item' : 'Add Promo Item'}</SheetTitle></SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="offer">Offer</SelectItem>
                      <SelectItem value="announcement">Announcement</SelectItem>
                      <SelectItem value="ad">Ad</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="image_url" render={({ field }) => (
                <FormItem>
                  <FormLabel>Image</FormLabel>
                  <FormControl><ImageUpload value={field.value} onChange={field.onChange} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="title_en" render={({ field }) => (
                  <FormItem><FormLabel>Title (EN)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="title_ar" render={({ field }) => (
                  <FormItem><FormLabel>Title (AR)</FormLabel><FormControl><Input dir="rtl" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="short_description_en" render={({ field }) => (
                  <FormItem><FormLabel>Short Description (EN)</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="short_description_ar" render={({ field }) => (
                  <FormItem><FormLabel>Short Description (AR)</FormLabel><FormControl><Textarea rows={2} dir="rtl" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="long_description_en" render={({ field }) => (
                  <FormItem><FormLabel>Long Description (EN)</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="long_description_ar" render={({ field }) => (
                  <FormItem><FormLabel>Long Description (AR)</FormLabel><FormControl><Textarea rows={3} dir="rtl" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="sort_order" render={({ field }) => (
                  <FormItem><FormLabel>Sort Order</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="is_active" render={({ field }) => (
                  <FormItem className="flex flex-col justify-end">
                    <FormLabel>Active</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="show_from" render={({ field }) => (
                  <FormItem><FormLabel>Show From</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="show_to" render={({ field }) => (
                  <FormItem><FormLabel>Show To</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <SheetFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isBusy}>{isBusy ? 'Saving…' : 'Save'}</Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Promo Item"
        description={`Delete "${deleteTarget?.title_en}"? This action cannot be undone.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
