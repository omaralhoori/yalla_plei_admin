import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Film } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import DataTable, { type Column } from '@/components/shared/DataTable'
import PageHeader from '@/components/shared/PageHeader'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import ImageUpload from '@/components/shared/ImageUpload'
import { MatchCombobox } from '@/components/shared/MatchCombobox'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { ApiResponse, Highlight, HighlightPayload, Sport } from '@/types/api'

const highlightSchema = z.object({
  match_id: z.string().min(1, 'Match ID is required'),
  sport_id: z.string().min(1, 'Sport is required'),
  media_url: z.string().url('Must be a valid URL'),
  thumbnail_url: z.string().optional(),
  description: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  show_from: z.string().optional(),
  show_to: z.string().optional(),
})

type HighlightFormValues = z.infer<typeof highlightSchema>

export default function HighlightsPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Highlight | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Highlight | null>(null)

  const { data: highlights = [], isLoading } = useQuery({
    queryKey: ['highlights'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Highlight[]>>('/admin/highlights')
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

  const form = useForm<HighlightFormValues>({
    resolver: zodResolver(highlightSchema),
    defaultValues: {
      match_id: '', sport_id: '', media_url: '', thumbnail_url: '',
      description: '', date: '', show_from: '', show_to: '',
    },
  })

  const createMutation = useMutation({
    mutationFn: (payload: HighlightPayload) => api.post('/admin/highlights', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['highlights'] })
      toast({ title: 'Highlight created', variant: 'success' as never })
      setSheetOpen(false)
    },
    onError: () => toast({ title: 'Failed to create highlight', variant: 'destructive' }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: HighlightPayload }) =>
      api.put(`/admin/highlights/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['highlights'] })
      toast({ title: 'Highlight updated', variant: 'success' as never })
      setSheetOpen(false)
    },
    onError: () => toast({ title: 'Failed to update highlight', variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/highlights/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['highlights'] })
      toast({ title: 'Highlight deleted', variant: 'success' as never })
      setDeleteTarget(null)
    },
    onError: () => toast({ title: 'Failed to delete highlight', variant: 'destructive' }),
  })

  function openCreate() {
    setEditTarget(null)
    form.reset({ match_id: '', sport_id: '', media_url: '', thumbnail_url: '', description: '', date: '', show_from: '', show_to: '' })
    setSheetOpen(true)
  }

  function openEdit(h: Highlight) {
    setEditTarget(h)
    form.reset({
      match_id: h.match_id,
      sport_id: h.sport_id,
      media_url: h.media_url,
      thumbnail_url: h.thumbnail_url ?? '',
      description: h.description ?? '',
      date: h.date,
      show_from: h.show_from ?? '',
      show_to: h.show_to ?? '',
    })
    setSheetOpen(true)
  }

  function onSubmit(values: HighlightFormValues) {
    const payload: HighlightPayload = {
      ...values,
      thumbnail_url: values.thumbnail_url || undefined,
      description: values.description || undefined,
      show_from: values.show_from || undefined,
      show_to: values.show_to || undefined,
    }
    if (editTarget) updateMutation.mutate({ id: editTarget.id, payload })
    else createMutation.mutate(payload)
  }

  const isBusy = createMutation.isPending || updateMutation.isPending

  const columns: Column<Highlight>[] = [
    {
      key: 'thumbnail',
      header: 'Preview',
      cell: row => row.thumbnail_url ? (
        <img src={row.thumbnail_url} alt="thumbnail" className="w-16 h-10 rounded object-cover" />
      ) : (
        <div className="w-16 h-10 rounded bg-muted flex items-center justify-center">
          <Film className="w-4 h-4 text-muted-foreground" />
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      cell: row => (
        <div>
          <p className="text-sm font-medium truncate max-w-[220px]">{row.description ?? '—'}</p>
          <a
            href={row.media_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline truncate block max-w-[220px]"
          >
            {row.media_url}
          </a>
        </div>
      ),
    },
    {
      key: 'sport',
      header: 'Sport',
      cell: row => <span className="text-sm">{row.sport?.name_en ?? '—'}</span>,
    },
    {
      key: 'date',
      header: 'Date',
      cell: row => <span className="text-sm">{formatDate(row.date)}</span>,
    },
    {
      key: 'visibility',
      header: 'Show Period',
      cell: row => row.show_from && row.show_to ? (
        <div className="text-xs text-muted-foreground">
          <div>{formatDate(row.show_from)}</div>
          <div>→ {formatDate(row.show_to)}</div>
        </div>
      ) : <span className="text-muted-foreground text-sm">Always</span>,
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
        title="Highlights"
        subtitle="Manage featured match highlights and media"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Highlight</Button>}
      />

      <DataTable columns={columns} data={highlights} isLoading={isLoading} />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader><SheetTitle>{editTarget ? 'Edit Highlight' : 'Add Highlight'}</SheetTitle></SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
              <FormField control={form.control} name="match_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Match</FormLabel>
                  <FormControl>
                    <MatchCombobox value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="sport_id" render={({ field }) => (
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
              <FormField control={form.control} name="media_url" render={({ field }) => (
                <FormItem><FormLabel>Media URL (video/image)</FormLabel><FormControl><Input type="url" placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="thumbnail_url" render={({ field }) => (
                <FormItem><FormLabel>Thumbnail</FormLabel><FormControl><ImageUpload value={field.value ?? ''} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={2} placeholder="Brief description..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="show_from" render={({ field }) => (
                  <FormItem><FormLabel>Show From</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="show_to" render={({ field }) => (
                  <FormItem><FormLabel>Show To</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
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
        title="Delete Highlight"
        description={`Delete this highlight? This action cannot be undone.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
