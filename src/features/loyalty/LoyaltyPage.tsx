import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, AlertCircle, TrendingUp, TrendingDown, Crown, Sparkles, Calendar, RefreshCw, X } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import DataTable, { type Column } from '@/components/shared/DataTable'
import PageHeader from '@/components/shared/PageHeader'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import ImageUpload from '@/components/shared/ImageUpload'
import { useToast } from '@/hooks/use-toast'
import { usePagination } from '@/hooks/usePagination'
import { api } from '@/lib/api'
import type {
  ApiResponse, Level, LevelPayload, PointRule, PointRulePayload,
  Reward, RewardPayload, XpRule, XpRulePayload,
  MonthlyLeaderboardEntry, PaginatedResponse, Sport,
} from '@/types/api'

// ─── Levels Tab ───────────────────────────────────────────────────────────────

const CARD_TYPES = ['standard', 'silver', 'gold', 'platinum'] as const

const levelSchema = z
  .object({
    name_en: z.string().min(1, 'English name is required'),
    name_ar: z.string().min(1, 'Arabic name is required'),
    min_points: z.coerce.number().int().min(0, 'Must be ≥ 0'),
    max_points: z.coerce.number().int().min(1, 'Must be ≥ 1'),
    discount_percent: z.coerce.number().min(0).max(100, 'Must be between 0 and 100'),
    benefits_en: z.string().min(1, 'English benefits are required'),
    benefits_ar: z.string().min(1, 'Arabic benefits are required'),
    card_type: z.enum(CARD_TYPES, { required_error: 'Card type is required' }),
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
    defaultValues: {
      name_en: '', name_ar: '', min_points: 0, max_points: 0,
      discount_percent: 0, benefits_en: '', benefits_ar: '', card_type: 'standard',
    },
  })

  function handleMutationError(err: unknown) {
    const axiosErr = err as { response?: { status?: number; data?: { error?: string } } }
    const status = axiosErr?.response?.status
    const msg = axiosErr?.response?.data?.error ?? ''
    if (status === 409 || msg.toLowerCase().includes('overlap')) {
      setOverlapError(
        'This XP range overlaps with an existing level. Adjust min / max XP and try again.'
      )
    } else if (msg.toLowerCase().includes('discount_percent')) {
      setOverlapError('Discount percent must be between 0 and 100.')
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
    form.reset({
      name_en: '', name_ar: '', min_points: 0, max_points: 0,
      discount_percent: 0, benefits_en: '', benefits_ar: '', card_type: 'standard',
    })
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
      discount_percent: level.discount_percent,
      benefits_en: level.benefits_en,
      benefits_ar: level.benefits_ar,
      card_type: (CARD_TYPES.includes(level.card_type as typeof CARD_TYPES[number])
        ? level.card_type
        : 'standard') as typeof CARD_TYPES[number],
    })
    setSheetOpen(true)
  }

  function onSubmit(values: LevelFormValues) {
    setOverlapError('')
    if (editTarget) updateMutation.mutate({ id: editTarget.id, payload: values })
    else createMutation.mutate(values)
  }

  const isBusy = createMutation.isPending || updateMutation.isPending

  const cardTypeBadge: Record<string, string> = {
    standard: 'bg-slate-100 text-slate-700',
    silver:   'bg-gray-200 text-gray-700',
    gold:     'bg-amber-100 text-amber-700',
    platinum: 'bg-sky-100 text-sky-700',
  }

  const columns: Column<Level>[] = [
    { key: 'name_en', header: 'Name', cell: row => <span className="font-medium">{row.name_en}</span> },
    { key: 'name_ar', header: 'Name (AR)', cell: row => <span dir="rtl" className="text-sm">{row.name_ar}</span> },
    {
      key: 'range',
      header: 'XP Range',
      cell: row => (
        <code className="text-xs bg-muted px-2 py-0.5 rounded">
          {row.min_points.toLocaleString()} – {row.max_points.toLocaleString()}
        </code>
      ),
    },
    {
      key: 'discount_percent',
      header: 'Discount',
      cell: row => (
        <span className="text-sm font-medium text-green-600">
          {row.discount_percent}%
        </span>
      ),
    },
    {
      key: 'card_type',
      header: 'Card',
      cell: row => (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${cardTypeBadge[row.card_type] ?? 'bg-muted text-muted-foreground'}`}>
          {row.card_type}
        </span>
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
                    <FormLabel>Min XP</FormLabel>
                    <FormControl><Input type="number" min="0" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="max_points" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max XP</FormLabel>
                    <FormControl><Input type="number" min="1" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="discount_percent" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount (%)</FormLabel>
                    <FormControl><Input type="number" min="0" max="100" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="card_type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Card Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CARD_TYPES.map(t => (
                          <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="benefits_en" render={({ field }) => (
                <FormItem>
                  <FormLabel>Benefits (English)</FormLabel>
                  <FormControl><Textarea rows={2} placeholder="e.g. 10% discount on match bookings" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="benefits_ar" render={({ field }) => (
                <FormItem>
                  <FormLabel>Benefits (Arabic)</FormLabel>
                  <FormControl><Textarea dir="rtl" rows={2} placeholder="مثال: خصم 10% على حجز المباريات" {...field} /></FormControl>
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
        title="Delete Level"
        description={`Delete the "${deleteTarget?.name_en}" level (${deleteTarget?.min_points}–${deleteTarget?.max_points} XP)? Players at this level won't be immediately affected.`}
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
      header: 'Required Monthly Pts',
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
      <p className="text-sm text-muted-foreground mb-4">
        Rewards are redeemed with <strong>monthly competitive points</strong> (reset each calendar month).
      </p>
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

// ─── Point Rules Tab ──────────────────────────────────────────────────────────

const pointRuleSchema = z.object({
  name_en: z.string().min(1, 'English name is required'),
  name_ar: z.string().min(1, 'Arabic name is required'),
  points: z.coerce.number().int().refine(v => v !== 0, { message: 'Points cannot be zero' }),
  subscriber_points: z.coerce.number().int(),
  is_enabled: z.boolean(),
})

type PointRuleFormValues = z.infer<typeof pointRuleSchema>

function PointRulesTab() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [editTarget, setEditTarget] = useState<PointRule | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['point-rules'],
    queryFn: async () => (await api.get<ApiResponse<PointRule[]>>('/admin/point-rules')).data.data,
  })

  const form = useForm<PointRuleFormValues>({
    resolver: zodResolver(pointRuleSchema),
    defaultValues: { name_en: '', name_ar: '', points: 0, subscriber_points: 0, is_enabled: true },
  })

  const updateMutation = useMutation({
    mutationFn: ({ key, payload }: { key: string; payload: PointRulePayload }) =>
      api.put(`/admin/point-rules/${key}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['point-rules'] })
      toast({ title: 'Rule updated', variant: 'success' as never })
      setSheetOpen(false)
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      const msg = axiosErr?.response?.data?.error ?? 'Failed to update rule'
      toast({ title: msg, variant: 'destructive' })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ key, is_enabled }: { key: string; is_enabled: boolean }) =>
      api.put(`/admin/point-rules/${key}`, { is_enabled }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['point-rules'] })
      toast({ title: 'Rule updated', variant: 'success' as never })
    },
    onError: () => toast({ title: 'Failed to update rule', variant: 'destructive' }),
  })

  function openEdit(rule: PointRule) {
    setEditTarget(rule)
    form.reset({
      name_en: rule.name_en,
      name_ar: rule.name_ar,
      points: rule.points,
      subscriber_points: rule.subscriber_points ?? 0,
      is_enabled: rule.is_enabled,
    })
    setSheetOpen(true)
  }

  function onSubmit(values: PointRuleFormValues) {
    if (!editTarget) return
    updateMutation.mutate({ key: editTarget.key, payload: values })
  }

  const columns: Column<PointRule>[] = [
    {
      key: 'name_en',
      header: 'Rule',
      cell: row => (
        <div>
          <div className="font-medium">{row.name_en}</div>
          <div className="text-xs text-muted-foreground" dir="rtl">{row.name_ar}</div>
        </div>
      ),
    },
    {
      key: 'key',
      header: 'Key',
      cell: row => (
        <code className="text-xs bg-muted px-2 py-0.5 rounded">{row.key}</code>
      ),
    },
    {
      key: 'points',
      header: 'Monthly Pts',
      cell: row => {
        const isPositive = row.points > 0
        return (
          <div className={`inline-flex items-center gap-1 font-semibold text-sm ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
            {isPositive
              ? <TrendingUp className="w-3.5 h-3.5" />
              : <TrendingDown className="w-3.5 h-3.5" />}
            {isPositive ? `+${row.points}` : row.points}
          </div>
        )
      },
    },
    {
      key: 'subscriber_points',
      header: 'Subscriber Points',
      cell: row => {
        // 0 means "not configured" — the engine falls back to the normal points.
        if (!row.subscriber_points) {
          return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Crown className="w-3.5 h-3.5" />= normal ({row.points > 0 ? `+${row.points}` : row.points})</span>
        }
        const isPositive = row.subscriber_points > 0
        return (
          <div className="inline-flex items-center gap-1 font-semibold text-sm text-amber-600">
            <Crown className="w-3.5 h-3.5" />
            {isPositive ? `+${row.subscriber_points}` : row.subscriber_points}
          </div>
        )
      },
    },
    {
      key: 'is_enabled',
      header: 'Enabled',
      cell: row => (
        <Switch
          checked={row.is_enabled}
          disabled={toggleMutation.isPending}
          onCheckedChange={checked => toggleMutation.mutate({ key: row.key, is_enabled: checked })}
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: row => (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        Configure how many <strong>monthly competitive points</strong> players earn or lose for each action.
        Points reset each calendar month (Asia/Amman) and power monthly rankings and reward redemption.
        Active subscribers earn the
        <span className="inline-flex items-center gap-1 mx-1 align-middle text-amber-600"><Crown className="w-3.5 h-3.5" />subscriber points</span>
        instead (0 = same as normal). Disabled rules contribute 0 points. Changes apply to future bookings only.
      </p>
      <DataTable columns={columns} data={rules} isLoading={isLoading} emptyMessage="No point rules found." />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Monthly Point Rule</SheetTitle>
          </SheetHeader>
          {editTarget && (
            <div className="mt-2 mb-4">
              <code className="text-xs bg-muted px-2 py-1 rounded">{editTarget.key}</code>
            </div>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name_en" render={({ field }) => (
                <FormItem><FormLabel>Name (English)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="name_ar" render={({ field }) => (
                <FormItem><FormLabel>Name (Arabic)</FormLabel><FormControl><Input dir="rtl" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="points" render={({ field }) => (
                <FormItem>
                  <FormLabel>Points</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      placeholder="Use negative value for deductions (e.g. -5)"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">Use a negative value to deduct points (e.g. -10 for a red card).</p>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="subscriber_points" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5"><Crown className="w-3.5 h-3.5 text-amber-600" />Subscriber Points</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} placeholder="0 = same as normal points" />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">Awarded to active subscribers for this action. Set to <strong>0</strong> to fall back to the normal points above.</p>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="is_enabled" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel className="text-sm font-medium">Enabled</FormLabel>
                    <p className="text-xs text-muted-foreground">Disabled rules contribute 0 points</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )} />
              <SheetFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ─── XP Rules Tab ─────────────────────────────────────────────────────────────

const xpRuleSchema = z.object({
  name_en: z.string().min(1, 'English name is required'),
  name_ar: z.string().min(1, 'Arabic name is required'),
  points: z.coerce.number().int().refine(v => v !== 0, { message: 'XP cannot be zero' }),
  is_enabled: z.boolean(),
})

type XpRuleFormValues = z.infer<typeof xpRuleSchema>

function XpRulesTab() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [editTarget, setEditTarget] = useState<XpRule | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['xp-rules'],
    queryFn: async () => (await api.get<ApiResponse<XpRule[]>>('/admin/xp-rules')).data.data,
  })

  const form = useForm<XpRuleFormValues>({
    resolver: zodResolver(xpRuleSchema),
    defaultValues: { name_en: '', name_ar: '', points: 0, is_enabled: true },
  })

  const updateMutation = useMutation({
    mutationFn: ({ key, payload }: { key: string; payload: XpRulePayload }) =>
      api.put(`/admin/xp-rules/${key}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['xp-rules'] })
      toast({ title: 'XP rule updated', variant: 'success' as never })
      setSheetOpen(false)
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      const msg = axiosErr?.response?.data?.error ?? 'Failed to update rule'
      toast({ title: msg, variant: 'destructive' })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ key, is_enabled }: { key: string; is_enabled: boolean }) =>
      api.put(`/admin/xp-rules/${key}`, { is_enabled }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['xp-rules'] })
      toast({ title: 'XP rule updated', variant: 'success' as never })
    },
    onError: () => toast({ title: 'Failed to update rule', variant: 'destructive' }),
  })

  function openEdit(rule: XpRule) {
    setEditTarget(rule)
    form.reset({
      name_en: rule.name_en,
      name_ar: rule.name_ar,
      points: rule.points,
      is_enabled: rule.is_enabled,
    })
    setSheetOpen(true)
  }

  function onSubmit(values: XpRuleFormValues) {
    if (!editTarget) return
    updateMutation.mutate({ key: editTarget.key, payload: values })
  }

  const columns: Column<XpRule>[] = [
    {
      key: 'name_en',
      header: 'Rule',
      cell: row => (
        <div>
          <div className="font-medium">{row.name_en}</div>
          <div className="text-xs text-muted-foreground" dir="rtl">{row.name_ar}</div>
        </div>
      ),
    },
    {
      key: 'key',
      header: 'Key',
      cell: row => <code className="text-xs bg-muted px-2 py-0.5 rounded">{row.key}</code>,
    },
    {
      key: 'points',
      header: 'XP',
      cell: row => {
        const isPositive = row.points > 0
        return (
          <div className={`inline-flex items-center gap-1 font-semibold text-sm ${isPositive ? 'text-violet-600' : 'text-red-500'}`}>
            {isPositive ? <Sparkles className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {isPositive ? `+${row.points}` : row.points}
          </div>
        )
      },
    },
    {
      key: 'is_enabled',
      header: 'Enabled',
      cell: row => (
        <Switch
          checked={row.is_enabled}
          disabled={toggleMutation.isPending}
          onCheckedChange={checked => toggleMutation.mutate({ key: row.key, is_enabled: checked })}
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: row => (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        Configure permanent <strong>XP</strong> awarded for each scoring action. XP never resets and drives
        player levels and cards. There is <strong>no subscriber boost</strong> on XP — all players use the same values.
        Admin manual adjustments also apply to XP.
      </p>
      <DataTable columns={columns} data={rules} isLoading={isLoading} emptyMessage="No XP rules found." />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit XP Rule</SheetTitle>
          </SheetHeader>
          {editTarget && (
            <div className="mt-2 mb-4">
              <code className="text-xs bg-muted px-2 py-1 rounded">{editTarget.key}</code>
            </div>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name_en" render={({ field }) => (
                <FormItem><FormLabel>Name (English)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="name_ar" render={({ field }) => (
                <FormItem><FormLabel>Name (Arabic)</FormLabel><FormControl><Input dir="rtl" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="points" render={({ field }) => (
                <FormItem>
                  <FormLabel>XP</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} placeholder="Use negative value for deductions (e.g. -5)" />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">Use a negative value to deduct XP (e.g. -10 for a red card).</p>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="is_enabled" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel className="text-sm font-medium">Enabled</FormLabel>
                    <p className="text-xs text-muted-foreground">Disabled rules contribute 0 XP</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )} />
              <SheetFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ─── Monthly Archives Tab ─────────────────────────────────────────────────────

const ALL = 'all'

function parseBreakdown(raw: MonthlyLeaderboardEntry['breakdown_json']): Record<string, number> | null {
  if (!raw) return null
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as Record<string, number>
      return typeof parsed === 'object' && parsed !== null ? parsed : null
    } catch {
      return null
    }
  }
  return raw
}

function MonthlyArchivesTab() {
  const { offset, limit, goToNextPage, goToPrevPage, reset } = usePagination(20)
  const [period, setPeriod] = useState('')
  const [sportId, setSportId] = useState('')
  const [appliedPeriod, setAppliedPeriod] = useState('')
  const [appliedSportId, setAppliedSportId] = useState('')

  const { data: sports = [] } = useQuery({
    queryKey: ['sports'],
    queryFn: async () => (await api.get<ApiResponse<Sport[]>>('/sports')).data.data,
  })

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['monthly-leaderboard-archives', offset, limit, appliedPeriod, appliedSportId],
    queryFn: async () => {
      const params = new URLSearchParams({
        period: appliedPeriod,
        limit: String(limit),
        offset: String(offset),
      })
      if (appliedSportId) params.set('sport_id', appliedSportId)
      const res = await api.get<ApiResponse<PaginatedResponse<MonthlyLeaderboardEntry>>>(
        `/admin/leaderboards/monthly/archives?${params}`,
      )
      return res.data.data
    },
    enabled: !!appliedPeriod,
  })

  function applyFilters() {
    if (!period) return
    setAppliedPeriod(period)
    setAppliedSportId(sportId)
    reset()
  }

  function clearFilters() {
    setPeriod('')
    setSportId('')
    setAppliedPeriod('')
    setAppliedSportId('')
    reset()
  }

  const columns: Column<MonthlyLeaderboardEntry>[] = [
    {
      key: 'rank',
      header: '#',
      cell: row => <span className="font-semibold tabular-nums">{row.rank}</span>,
    },
    {
      key: 'player',
      header: 'Player',
      cell: row => (
        <div>
          <p className="text-sm font-medium">
            {row.user ? `${row.user.first_name} ${row.user.last_name}` : row.user_id}
          </p>
          {row.user?.email && <p className="text-xs text-muted-foreground">{row.user.email}</p>}
        </div>
      ),
    },
    {
      key: 'monthly_points',
      header: 'Monthly Pts',
      cell: row => (
        <span className="font-semibold text-amber-600 tabular-nums">{row.monthly_points.toLocaleString()}</span>
      ),
    },
    {
      key: 'stats',
      header: 'Stats',
      cell: row => (
        <div className="text-xs text-muted-foreground space-y-0.5">
          {row.total_matches != null && <div>{row.total_matches} matches</div>}
          {row.total_goals != null && <div>{row.total_goals} goals · {row.total_assists ?? 0} assists</div>}
          {row.total_mvps != null && row.total_mvps > 0 && <div>{row.total_mvps} MVP{row.total_mvps !== 1 ? 's' : ''}</div>}
        </div>
      ),
    },
    {
      key: 'breakdown',
      header: 'Breakdown',
      cell: row => {
        const breakdown = parseBreakdown(row.breakdown_json)
        if (!breakdown || Object.keys(breakdown).length === 0) {
          return <span className="text-muted-foreground text-sm">—</span>
        }
        return (
          <div className="flex flex-wrap gap-1 max-w-[220px]">
            {Object.entries(breakdown).map(([key, val]) => (
              <code key={key} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                {key}: {val > 0 ? `+${val}` : val}
              </code>
            ))}
          </div>
        )
      },
    },
  ]

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        Browse archived monthly leaderboard standings. Select a <strong>YYYY-MM</strong> period to load results.
      </p>

      <div className="bg-card border rounded-lg p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label>Period</Label>
          <Input type="month" value={period} onChange={e => setPeriod(e.target.value)} className="w-44" />
        </div>
        <div className="space-y-1">
          <Label>Sport</Label>
          <Select value={sportId || ALL} onValueChange={v => setSportId(v === ALL ? '' : v)}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All sports" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All sports</SelectItem>
              {sports.map(s => <SelectItem key={s.id} value={s.id}>{s.name_en}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={applyFilters} disabled={!period} className="gap-2">
          <RefreshCw className="w-4 h-4" />Load
        </Button>
        {appliedPeriod && (
          <Button variant="outline" onClick={clearFilters} className="gap-2">
            <X className="w-4 h-4" />Clear
          </Button>
        )}
      </div>

      {!appliedPeriod ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border rounded-lg bg-muted/20">
          <Calendar className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">Pick a month and click Load to view archived standings.</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          isLoading={isLoading || isFetching}
          pagination={data ? {
            total: data.meta.total_count,
            limit,
            offset,
            onChange: o => (o > offset ? goToNextPage() : goToPrevPage()),
          } : undefined}
          emptyMessage={`No archived standings for ${appliedPeriod}.`}
        />
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoyaltyPage() {
  return (
    <div>
      <PageHeader
        title="Loyalty & Gamification"
        subtitle="Monthly competitive points, permanent XP, levels, rewards, and leaderboard archives"
      />
      <Tabs defaultValue="levels" className="mt-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="levels">Levels</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="point-rules">Monthly Rules</TabsTrigger>
          <TabsTrigger value="xp-rules">XP Rules</TabsTrigger>
          <TabsTrigger value="archives">Archives</TabsTrigger>
        </TabsList>
        <TabsContent value="levels" className="mt-4">
          <p className="text-sm text-muted-foreground mb-4">
            Levels are assigned from per-sport <strong>total XP</strong>. When XP crosses a threshold the level updates automatically (up or down).
          </p>
          <LevelsTab />
        </TabsContent>
        <TabsContent value="rewards" className="mt-4">
          <RewardsTab />
        </TabsContent>
        <TabsContent value="point-rules" className="mt-4">
          <PointRulesTab />
        </TabsContent>
        <TabsContent value="xp-rules" className="mt-4">
          <XpRulesTab />
        </TabsContent>
        <TabsContent value="archives" className="mt-4">
          <MonthlyArchivesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
