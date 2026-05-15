import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import DataTable, { type Column } from '@/components/shared/DataTable'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import ImageUpload from '@/components/shared/ImageUpload'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'
import type { ApiResponse, Sport, SportPayload } from '@/types/api'

const sportSchema = z.object({
  name_en: z.string().min(1, 'English name is required'),
  name_ar: z.string().min(1, 'Arabic name is required'),
  image_url: z.string().min(1, 'Image is required'),
  is_enabled: z.boolean(),
  is_available: z.boolean(),
})

type SportFormValues = z.infer<typeof sportSchema>

export default function SportsPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Sport | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Sport | null>(null)

  const { data: sports = [], isLoading } = useQuery({
    queryKey: ['sports'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Sport[]>>('/sports')
      return res.data.data
    },
  })

  const form = useForm<SportFormValues>({
    resolver: zodResolver(sportSchema),
    defaultValues: { name_en: '', name_ar: '', image_url: '', is_enabled: true, is_available: true },
  })

  const createMutation = useMutation({
    mutationFn: (payload: SportPayload) => api.post('/admin/sports', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sports'] })
      toast({ title: 'Sport created', variant: 'success' as never })
      setSheetOpen(false)
    },
    onError: () => toast({ title: 'Failed to create sport', variant: 'destructive' }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SportPayload }) =>
      api.put(`/admin/sports/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sports'] })
      toast({ title: 'Sport updated', variant: 'success' as never })
      setSheetOpen(false)
    },
    onError: () => toast({ title: 'Failed to update sport', variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/sports/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sports'] })
      toast({ title: 'Sport deleted', variant: 'success' as never })
      setDeleteTarget(null)
    },
    onError: () => toast({ title: 'Failed to delete sport', variant: 'destructive' }),
  })

  function openCreate() {
    setEditTarget(null)
    form.reset({ name_en: '', name_ar: '', image_url: '', is_enabled: true, is_available: true })
    setSheetOpen(true)
  }

  function openEdit(sport: Sport) {
    setEditTarget(sport)
    form.reset({
      name_en: sport.name_en,
      name_ar: sport.name_ar,
      image_url: sport.image_url,
      is_enabled: sport.is_enabled,
      is_available: sport.is_available,
    })
    setSheetOpen(true)
  }

  function onSubmit(values: SportFormValues) {
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, payload: values })
    } else {
      createMutation.mutate(values)
    }
  }

  const isBusy = createMutation.isPending || updateMutation.isPending

  const columns: Column<Sport>[] = [
    {
      key: 'image',
      header: 'Image',
      cell: row => row.image_url
        ? <img src={row.image_url} alt={row.name_en} className="w-10 h-10 rounded-md object-cover" />
        : <div className="w-10 h-10 rounded-md bg-muted" />,
    },
    { key: 'name_en', header: 'Name (EN)', cell: row => <span className="font-medium">{row.name_en}</span> },
    { key: 'name_ar', header: 'Name (AR)', cell: row => <span dir="rtl">{row.name_ar}</span> },
    { key: 'is_enabled', header: 'Enabled', cell: row => <StatusBadge status={String(row.is_enabled)} /> },
    { key: 'is_available', header: 'Available', cell: row => <StatusBadge status={String(row.is_available)} /> },
    {
      key: 'actions',
      header: '',
      cell: row => (
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="outline" onClick={() => openEdit(row)}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(row)}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Sports"
        subtitle="Manage sports available on the platform"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Sport</Button>}
      />

      <DataTable columns={columns} data={sports} isLoading={isLoading} />

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editTarget ? 'Edit Sport' : 'Add Sport'}</SheetTitle>
          </SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
              <FormField control={form.control} name="name_en" render={({ field }) => (
                <FormItem><FormLabel>Name (English)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="name_ar" render={({ field }) => (
                <FormItem><FormLabel>Name (Arabic)</FormLabel><FormControl><Input dir="rtl" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="image_url" render={({ field }) => (
                <FormItem>
                  <FormLabel>Image</FormLabel>
                  <FormControl>
                    <ImageUpload value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="is_enabled" render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="!mt-0">Enabled</FormLabel>
                </FormItem>
              )} />
              <FormField control={form.control} name="is_available" render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="!mt-0">Available for booking</FormLabel>
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
        open={!!deleteTarget}
        title="Delete Sport"
        description={`Are you sure you want to delete "${deleteTarget?.name_en}"? This cannot be undone.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
