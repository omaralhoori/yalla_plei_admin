import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, AlertCircle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import DataTable, { type Column } from '@/components/shared/DataTable'
import PageHeader from '@/components/shared/PageHeader'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import ImageUpload from '@/components/shared/ImageUpload'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'
import type { ApiResponse, Level, LevelPayload, Reward, RewardPayload } from '@/types/api'

// ─── Levels Tab ───────────────────────────────────────────────────────────────

const levelSchema = z
  .object({
    name_en: z.string().min(1, 'English name is required'),
    name_ar: z.string().min(1, 'Arabic name is required'),
    min_points: z.coerce.number().int().min(0, 'Must be ≥ 0'),
    max_points: z.coerce.number().int().min(1, 'Must be ≥ 1'),
  })
  .refine(d => d.max_points > d.min_points, {
    message: 'Max points must be greater than min points',
    path: ['max_points'],
  })

type LevelFormValues = z.infer<typeof levelSchema>

function LevelsTab() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Level | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Level | null>(null)
  const [overlapError, setOverlapError] = useState('')

  const { data: levels = [], isLoading } = useQuery({
    queryKey: ['levels'],
    queryFn: async () => (await api.get<ApiResponse<Level[]>>('/admin/levels')).data.data,
  })

  const form = useForm<LevelFormValues>({
    resolver: zodResolver(levelSchema),
    defaultValues: { name_en: '', name_ar: '', min_points: 0, max_points: 0 },
  })

  function handleMutationError(err: unknown) {
    const axiosErr = err as { response?: { status?: number; data?: { error?: string } } }
    const status = axiosErr?.response?.status
    const msg = axiosErr?.response?.data?.error ?? ''
    if (status === 409 || msg.toLowerCase().includes('overlap')) {
      setOverlapError(
        'This point range overlaps with an existing level. Adjust min / max points and try again.'
      )
    } else {
      toast({ title: 'Failed to save level', variant: 'destructive' })
    }
  }

  const createMutation = useMutation({
    mutationFn: (payload: LevelPayload) => api.post('/admin/levels', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['levels'] })
      toast({ title: 'Level created', variant: 'success' as never })
      setSheetOpen(false)
    },
    onError: handleMutationError,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: LevelPayload }) =>
      api.put(`/admin/levels/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['levels'] })
      toast({ title: 'Level updated', variant: 'success' as never })
      setSheetOpen(false)
    },
    onError: handleMutationError,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/levels/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['levels'] })
      toast({ title: 'Level deleted', variant: 'success' as never })
      setDeleteTarget(null)
    },
    onError: () => toast({ title: 'Failed to delete level', variant: 'destructive' }),
  })

  function openCreate() {
    setEditTarget(null)
    setOverlapError('')
    form.reset({ name_en: '', name_ar: '', min_points: 0, max_points: 0 })
    setSheetOpen(true)
  }

  function openEdit(level: Level) {
    setEditTarget(level)
    setOverlapError('')
    form.reset({
      name_en: level.name_en,
      name_ar: level.name_ar,
      min_points: level.min_points,
      max_points: level.max_points,
    })
    setSheetOpen(true)
  }

  function onSubmit(values: LevelFormValues) {
    setOverlapError('')
    if (editTarget) updateMutation.mutate({ id: editTarget.id, payload: values })
    else createMutation.mutate(values)
  }

  const isBusy = createMutation.isPending || updateMutation.isPending

  const columns: Column<Level>[] = [
    { key: 'name_en', header: 'Name', cell: row => <span className="font-medium">{row.name_en}</span> },
    { key: 'name_ar', header: 'Name (AR)', cell: row => <span dir="rtl" className="text-sm">{row.name_ar}</span> },
    {
      key: 'range',
      header: 'Point Range',
      cell: row => (
        <code className="text-xs bg-muted px-2 py-0.5 rounded">
          {row.min_points.toLocaleString()} – {row.max_points.toLocaleString()}
        </code>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: row => (
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => setDeleteTarget(row)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Level</Button>
      </div>
      <DataTable columns={columns} data={levels} isLoading={isLoading} emptyMessage="No levels defined yet." />

      <Sheet
        open={sheetOpen}
        onOpenChange={open => { setSheetOpen(open); if (!open) setOverlapError('') }}
      >
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editTarget ? 'Edit Level' : 'Add Level'}</SheetTitle>
          </SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
              {overlapError && (
                <div className="flex gap-2 items-start p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{overlapError}</span>
                </div>
              )}
              <FormField control={form.control} name="name_en" render={({ field }) => (
                <FormItem><FormLabel>Name (English)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="name_ar" render={({ field }) => (
                <FormItem><FormLabel>Name (Arabic)</FormLabel><FormControl><Input dir="rtl" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="min_points" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Points</FormLabel>
                    <FormControl><Input type="number" min="0" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="max_points" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Points</FormLabel>
                    <FormControl><Input type="number" min="1" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
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
        title="Delete Level"
        description={`Delete the "${deleteTarget?.name_en}" level (${deleteTarget?.min_points}–${deleteTarget?.max_points} pts)? Players at this level won't be immediately affected.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

// ─── Rewards Tab ──────────────────────────────────────────────────────────────

const rewardSchema = z.object({
  name_en: z.string().min(1, 'English name is required'),
  name_ar: z.string().min(1, 'Arabic name is required'),
  image_url: z.string().min(1, 'Image is required'),
  required_points: z.coerce.number().int().min(1, 'Must be at least 1 point'),
})

type RewardFormValues = z.infer<typeof rewardSchema>

function RewardsTab() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Reward | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Reward | null>(null)

  const { data: rewards = [], isLoading } = useQuery({
    queryKey: ['rewards'],
    queryFn: async () => (await api.get<ApiResponse<Reward[]>>('/admin/rewards')).data.data,
  })

  const form = useForm<RewardFormValues>({
    resolver: zodResolver(rewardSchema),
    defaultValues: { name_en: '', name_ar: '', image_url: '', required_points: 0 },
  })

  const createMutation = useMutation({
    mutationFn: (payload: RewardPayload) => api.post('/admin/rewards', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rewards'] })
      toast({ title: 'Reward created', variant: 'success' as never })
      setSheetOpen(false)
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      const msg = axiosErr?.response?.data?.error ?? 'Failed to create reward'
      toast({ title: msg, variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RewardPayload }) =>
      api.put(`/admin/rewards/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rewards'] })
      toast({ title: 'Reward updated', variant: 'success' as never })
      setSheetOpen(false)
    },
    onError: () => toast({ title: 'Failed to update reward', variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/rewards/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rewards'] })
      toast({ title: 'Reward deleted', variant: 'success' as never })
      setDeleteTarget(null)
    },
    onError: () => toast({ title: 'Failed to delete reward', variant: 'destructive' }),
  })

  function openCreate() {
    setEditTarget(null)
    form.reset({ name_en: '', name_ar: '', image_url: '', required_points: 0 })
    setSheetOpen(true)
  }

  function openEdit(reward: Reward) {
    setEditTarget(reward)
    form.reset({
      name_en: reward.name_en,
      name_ar: reward.name_ar,
      image_url: reward.image_url,
      required_points: reward.required_points,
    })
    setSheetOpen(true)
  }

  function onSubmit(values: RewardFormValues) {
    if (editTarget) updateMutation.mutate({ id: editTarget.id, payload: values })
    else createMutation.mutate(values)
  }

  const isBusy = createMutation.isPending || updateMutation.isPending

  const columns: Column<Reward>[] = [
    {
      key: 'image',
      header: 'Image',
      cell: row => row.image_url
        ? <img src={row.image_url} alt={row.name_en} className="w-10 h-10 rounded-md object-cover" />
        : <div className="w-10 h-10 rounded-md bg-muted" />,
    },
    { key: 'name_en', header: 'Name', cell: row => <span className="font-medium">{row.name_en}</span> },
    { key: 'name_ar', header: 'Name (AR)', cell: row => <span dir="rtl" className="text-sm">{row.name_ar}</span> },
    {
      key: 'required_points',
      header: 'Required Points',
      cell: row => (
        <code className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
          {row.required_points.toLocaleString()} pts
        </code>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: row => (
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => setDeleteTarget(row)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Reward</Button>
      </div>
      <DataTable columns={columns} data={rewards} isLoading={isLoading} emptyMessage="No rewards defined yet." />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editTarget ? 'Edit Reward' : 'Add Reward'}</SheetTitle>
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
                  <FormLabel>Reward Image</FormLabel>
                  <FormControl><ImageUpload value={field.value} onChange={field.onChange} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="required_points" render={({ field }) => (
                <FormItem>
                  <FormLabel>Required Points</FormLabel>
                  <FormControl><Input type="number" min="1" {...field} /></FormControl>
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
        open={!!deleteTarget}
        title="Delete Reward"
        description={`Delete "${deleteTarget?.name_en}" (${deleteTarget?.required_points} pts)? Users who haven't redeemed it won't see it anymore.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoyaltyPage() {
  return (
    <div>
      <PageHeader
        title="Loyalty & Gamification"
        subtitle="Manage player levels, rewards, and the points system"
      />
      <Tabs defaultValue="levels" className="mt-4">
        <TabsList>
          <TabsTrigger value="levels">Levels</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
        </TabsList>
        <TabsContent value="levels" className="mt-4">
          <LevelsTab />
        </TabsContent>
        <TabsContent value="rewards" className="mt-4">
          <RewardsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
