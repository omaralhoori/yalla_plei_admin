import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import DataTable, { type Column } from '@/components/shared/DataTable'
import PageHeader from '@/components/shared/PageHeader'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import ImageUpload from '@/components/shared/ImageUpload'
import { useToast } from '@/hooks/use-toast'
import { usePagination } from '@/hooks/usePagination'
import { api } from '@/lib/api'
import type { ApiResponse, PaginatedResponse, Team, TeamPayload } from '@/types/api'

const teamSchema = z.object({
  name_en: z.string().min(1, 'English name is required'),
  name_ar: z.string().min(1, 'Arabic name is required'),
  logo_url: z.string().min(1, 'Logo is required'),
})

type TeamFormValues = z.infer<typeof teamSchema>

export default function TeamsPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { offset, limit, goToNextPage, goToPrevPage } = usePagination(20)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Team | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['teams', offset, limit],
    queryFn: async () => {
      const res = await api.get<ApiResponse<PaginatedResponse<Team>>>(`/teams?limit=${limit}&offset=${offset}`)
      return res.data.data
    },
  })

  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: { name_en: '', name_ar: '', logo_url: '' },
  })

  const createMutation = useMutation({
    mutationFn: (payload: TeamPayload) => api.post('/admin/teams', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teams'] }); toast({ title: 'Team created', variant: 'success' as never }); setSheetOpen(false) },
    onError: () => toast({ title: 'Failed to create team', variant: 'destructive' }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TeamPayload }) => api.put(`/admin/teams/${id}`, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teams'] }); toast({ title: 'Team updated', variant: 'success' as never }); setSheetOpen(false) },
    onError: () => toast({ title: 'Failed to update team', variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/teams/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teams'] }); toast({ title: 'Team deleted', variant: 'success' as never }); setDeleteTarget(null) },
    onError: () => toast({ title: 'Failed to delete team', variant: 'destructive' }),
  })

  function openCreate() {
    setEditTarget(null); form.reset(); setSheetOpen(true)
  }

  function openEdit(team: Team) {
    setEditTarget(team)
    form.reset({ name_en: team.name_en, name_ar: team.name_ar, logo_url: team.logo_url })
    setSheetOpen(true)
  }

  function onSubmit(values: TeamFormValues) {
    if (editTarget) updateMutation.mutate({ id: editTarget.id, payload: values })
    else createMutation.mutate(values)
  }

  const isBusy = createMutation.isPending || updateMutation.isPending

  const columns: Column<Team>[] = [
    {
      key: 'logo',
      header: 'Logo',
      cell: row => row.logo_url
        ? <img src={row.logo_url} alt={row.name_en} className="w-10 h-10 rounded-full object-cover" />
        : <div className="w-10 h-10 rounded-full bg-muted" />,
    },
    { key: 'name_en', header: 'Name (EN)', cell: row => <span className="font-medium">{row.name_en}</span> },
    { key: 'name_ar', header: 'Name (AR)', cell: row => <span dir="rtl">{row.name_ar}</span> },
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
        title="Teams"
        subtitle="Manage football teams for player profiles"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Team</Button>}
      />

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        pagination={data ? { total: data.meta.total_count, limit, offset, onChange: (o) => o > offset ? goToNextPage() : goToPrevPage() } : undefined}
      />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader><SheetTitle>{editTarget ? 'Edit Team' : 'Add Team'}</SheetTitle></SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
              <FormField control={form.control} name="name_en" render={({ field }) => (
                <FormItem><FormLabel>Name (English)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="name_ar" render={({ field }) => (
                <FormItem><FormLabel>Name (Arabic)</FormLabel><FormControl><Input dir="rtl" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="logo_url" render={({ field }) => (
                <FormItem><FormLabel>Logo</FormLabel><FormControl><ImageUpload value={field.value} onChange={field.onChange} label="Upload Logo" /></FormControl><FormMessage /></FormItem>
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
        title="Delete Team"
        description={`Delete "${deleteTarget?.name_en}"?`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
