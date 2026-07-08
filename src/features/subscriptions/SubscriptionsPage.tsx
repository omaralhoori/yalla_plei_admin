import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, RefreshCw, XCircle, Clock, Sparkles, Palette, ExternalLink, CreditCard, Webhook, Copy, AlertTriangle, Bell, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import DataTable, { type Column } from '@/components/shared/DataTable'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useToast } from '@/hooks/use-toast'
import { usePagination } from '@/hooks/usePagination'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type {
  ApiResponse, SubscriptionPlan, SubscriptionPlanPayload,
  SubscriptionConfig, SubscriptionConfigPayload,
  PlayerSubscription, SubscriptionsListResponse,
} from '@/types/api'

function formatPlanPrice(price: number, currency: string): string {
  return `${new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price)} ${currency}`
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? 'https://api.yallaplei.com/api/v1').replace(/\/$/, '')
const HYPERPAY_WEBHOOK_URL = `${API_BASE}/webhooks/hyperpay`

function copyText(value: string, toast: ReturnType<typeof useToast>['toast']) {
  navigator.clipboard?.writeText(value)
  toast({ title: 'Copied to clipboard', variant: 'success' as never })
}

// ─── Plans tab ────────────────────────────────────────────────────────────────

const planSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name_en: z.string().min(1, 'English name is required'),
  name_ar: z.string().min(1, 'Arabic name is required'),
  interval: z.enum(['monthly', 'annual']),
  price: z.coerce.number().min(0, 'Must be 0 or more'),
  currency: z.string().min(1, 'Currency is required'),
  apple_product_id: z.string().optional(),
  google_product_id: z.string().optional(),
  is_active: z.boolean(),
  sort_order: z.coerce.number().int().min(0, 'Must be 0 or more'),
})
type PlanFormValues = z.infer<typeof planSchema>

const DEFAULT_PLAN_VALUES: PlanFormValues = {
  code: '', name_en: '', name_ar: '', interval: 'monthly', price: 0, currency: 'SAR',
  apple_product_id: '', google_product_id: '', is_active: true, sort_order: 0,
}

function PlansTab() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<SubscriptionPlan | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SubscriptionPlan | null>(null)

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => (await api.get<ApiResponse<SubscriptionPlan[]>>('/admin/subscription-plans')).data.data,
  })

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: DEFAULT_PLAN_VALUES,
  })

  const createMutation = useMutation({
    mutationFn: (payload: SubscriptionPlanPayload) => api.post('/admin/subscription-plans', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subscription-plans'] }); toast({ title: 'Plan created', variant: 'success' as never }); setSheetOpen(false) },
    onError: () => toast({ title: 'Failed to create plan', variant: 'destructive' }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SubscriptionPlanPayload }) => api.put(`/admin/subscription-plans/${id}`, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subscription-plans'] }); toast({ title: 'Plan updated', variant: 'success' as never }); setSheetOpen(false) },
    onError: () => toast({ title: 'Failed to update plan', variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/subscription-plans/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subscription-plans'] }); toast({ title: 'Plan deleted', variant: 'success' as never }); setDeleteTarget(null) },
    onError: () => toast({ title: 'Failed to delete plan', variant: 'destructive' }),
  })

  function openCreate() { setEditTarget(null); form.reset(DEFAULT_PLAN_VALUES); setSheetOpen(true) }
  function openEdit(p: SubscriptionPlan) {
    setEditTarget(p)
    form.reset({
      code: p.code, name_en: p.name_en, name_ar: p.name_ar, interval: p.interval,
      price: p.price, currency: p.currency, apple_product_id: p.apple_product_id ?? '',
      google_product_id: p.google_product_id ?? '', is_active: p.is_active, sort_order: p.sort_order,
    })
    setSheetOpen(true)
  }
  function onSubmit(v: PlanFormValues) {
    const payload: SubscriptionPlanPayload = {
      ...v,
      apple_product_id: v.apple_product_id?.trim() || undefined,
      google_product_id: v.google_product_id?.trim() || undefined,
    }
    if (editTarget) updateMutation.mutate({ id: editTarget.id, payload })
    else createMutation.mutate(payload)
  }

  const isBusy = createMutation.isPending || updateMutation.isPending

  const columns: Column<SubscriptionPlan>[] = [
    {
      key: 'name',
      header: 'Plan',
      cell: row => (
        <div>
          <div className="font-medium">{row.name_en}</div>
          <code className="text-xs text-muted-foreground">{row.code}</code>
        </div>
      ),
    },
    { key: 'interval', header: 'Interval', cell: row => <Badge variant="secondary" className="capitalize">{row.interval}</Badge> },
    { key: 'price', header: 'Price', cell: row => <span className="font-semibold text-sm">{formatPlanPrice(row.price, row.currency)}</span> },
    {
      key: 'store',
      header: 'Store IDs',
      cell: row => (
        <div className="text-xs text-muted-foreground space-y-0.5">
          <div>Apple: {row.apple_product_id || '—'}</div>
          <div>Google: {row.google_product_id || '—'}</div>
        </div>
      ),
    },
    { key: 'sort', header: 'Order', cell: row => <span className="text-sm">{row.sort_order}</span> },
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
      <p className="text-sm text-muted-foreground mb-4">
        Website subscribers are billed via <strong>HyperPay</strong> (tokenized card / Apple Pay). Mobile uses App Store / Google Play store product IDs below.
        Plan price changes affect <strong>future</strong> checkouts and renewals.
      </p>
      <div className="flex justify-end mb-4">
        <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" />Add Plan</Button>
      </div>
      <DataTable columns={columns} data={plans} isLoading={isLoading} emptyMessage="No subscription plans yet." />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader><SheetTitle>{editTarget ? 'Edit Plan' : 'Add Plan'}</SheetTitle></SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
              <FormField control={form.control} name="name_en" render={({ field }) => (
                <FormItem><FormLabel>Name (English)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="name_ar" render={({ field }) => (
                <FormItem><FormLabel>Name (Arabic)</FormLabel><FormControl><Input dir="rtl" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel>Code (unique)</FormLabel>
                  <FormControl><Input placeholder="e.g. monthly, annual" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="interval" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interval</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="sort_order" render={({ field }) => (
                  <FormItem><FormLabel>Sort Order</FormLabel><FormControl><Input type="number" min="0" step="1" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem><FormLabel>Price</FormLabel><FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="currency" render={({ field }) => (
                  <FormItem><FormLabel>Currency</FormLabel><FormControl><Input placeholder="SAR" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="apple_product_id" render={({ field }) => (
                <FormItem><FormLabel>Apple Product ID</FormLabel><FormControl><Input dir="ltr" placeholder="com.yallaplei.sub.monthly" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="google_product_id" render={({ field }) => (
                <FormItem><FormLabel>Google Product ID</FormLabel><FormControl><Input dir="ltr" placeholder="sub_monthly" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="is_active" render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="!mt-0">Active (purchasable)</FormLabel>
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
        title="Delete Plan"
        description={`Delete "${deleteTarget?.name_en}"? Existing subscribers are not affected, but the plan can no longer be purchased.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

// ─── Benefits configuration tab ───────────────────────────────────────────────

const configSchema = z.object({
  early_join_minutes: z.coerce.number().int('Whole number').min(0, 'Must be 0 or more'),
  theme: z.string().min(1, 'Theme is required'),
})
type ConfigFormValues = z.infer<typeof configSchema>

function BenefitsTab() {
  const qc = useQueryClient()
  const { toast } = useToast()

  const { data: config, isLoading } = useQuery({
    queryKey: ['subscription-config'],
    queryFn: async () => (await api.get<ApiResponse<SubscriptionConfig>>('/admin/subscription-config')).data.data,
  })

  const form = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    values: config
      ? { early_join_minutes: config.early_join_minutes, theme: config.theme }
      : undefined,
    defaultValues: { early_join_minutes: 15, theme: 'premium' },
  })

  const updateMutation = useMutation({
    mutationFn: (payload: SubscriptionConfigPayload) => api.put('/admin/subscription-config', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscription-config'] })
      toast({ title: 'Benefits updated — applied to all active subscribers', variant: 'success' as never })
    },
    onError: () => toast({ title: 'Failed to update benefits', variant: 'destructive' }),
  })

  function onSubmit(v: ConfigFormValues) {
    updateMutation.mutate(v)
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Subscriber Benefits
        </CardTitle>
        <CardDescription>
          Shared perks unlocked for every active subscriber. Changes apply immediately to all members.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField control={form.control} name="early_join_minutes" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Clock className="w-4 h-4" />Early Match Access (minutes)</FormLabel>
                  <FormControl><Input type="number" min="0" step="1" className="max-w-[180px]" {...field} /></FormControl>
                  <p className="text-xs text-muted-foreground">Minutes before public registration that subscribers may join a match.</p>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="rounded-lg border bg-muted/40 p-3 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Boosted loyalty points for subscribers are now configured <strong>per action</strong> via the
                  {' '}<Link to="/loyalty" className="text-primary hover:underline">Loyalty → Point Rules</Link>{' '}
                  <strong>Subscriber Points</strong> field — there is no longer a global multiplier.
                </p>
              </div>
              <FormField control={form.control} name="theme" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Palette className="w-4 h-4" />Premium Profile Theme</FormLabel>
                  <FormControl><Input placeholder="e.g. premium, gold" className="max-w-[280px]" {...field} /></FormControl>
                  <p className="text-xs text-muted-foreground">Theme key the app renders on a subscriber&apos;s profile.</p>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving…' : 'Save Benefits'}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Members tab ──────────────────────────────────────────────────────────────

function MembersTab() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { offset, limit, goToNextPage, goToPrevPage, reset } = usePagination(20)

  const [statusFilter, setStatusFilter] = useState('')
  const [providerFilter, setProviderFilter] = useState('')
  const [applied, setApplied] = useState({ status: '', provider: '' })
  const [cancelTarget, setCancelTarget] = useState<PlayerSubscription | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['subscriptions', offset, limit, applied],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (applied.status) params.set('status', applied.status)
      if (applied.provider) params.set('provider', applied.provider)
      const res = await api.get<ApiResponse<SubscriptionsListResponse>>(`/admin/subscriptions?${params}`)
      return res.data.data
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/subscriptions/${id}/cancel`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] })
      toast({ title: 'Subscription cancelled', variant: 'success' as never })
      setCancelTarget(null)
    },
    onError: () => toast({ title: 'Failed to cancel subscription', variant: 'destructive' }),
  })

  function applyFilters() {
    reset()
    setApplied({ status: statusFilter, provider: providerFilter })
  }

  const subscriptions = data?.subscriptions ?? []

  const columns: Column<PlayerSubscription>[] = [
    {
      key: 'member',
      header: 'Member',
      cell: row => row.user ? (
        <Link to={`/users/${row.user_id}`} className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          {row.user.first_name} {row.user.last_name}
          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100" />
        </Link>
      ) : (
        <Link to={`/users/${row.user_id}`} className="font-mono text-xs text-primary hover:underline">{row.user_id}</Link>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      cell: row => (
        <div>
          <div className="text-sm font-medium">{row.plan?.name_en ?? row.plan?.code ?? '—'}</div>
          <Badge variant="secondary" className="capitalize text-xs mt-0.5">{row.interval}</Badge>
        </div>
      ),
    },
    { key: 'provider', header: 'Provider', cell: row => (
      <div>
        <Badge variant="outline" className="capitalize">{row.provider}</Badge>
        {row.provider === 'hyperpay' && row.provider_ref && (
          <code className="block text-[10px] text-muted-foreground mt-1 truncate max-w-[140px]" title={row.provider_ref}>
            {row.provider_ref}
          </code>
        )}
      </div>
    ) },
    { key: 'status', header: 'Status', cell: row => <StatusBadge status={row.status} /> },
    {
      key: 'period',
      header: 'Current Period',
      cell: row => (
        <div className="text-xs text-muted-foreground">
          <div>{formatDate(row.current_period_start)} → {formatDate(row.current_period_end)}</div>
          <div className="mt-0.5">{row.auto_renew ? 'Auto-renew on' : 'Auto-renew off'}</div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: row => (row.status === 'active' || row.status === 'pending') ? (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs text-destructive hover:text-destructive"
          onClick={() => setCancelTarget(row)}
        >
          <XCircle className="w-3.5 h-3.5" />
          Cancel
        </Button>
      ) : null,
    },
  ]

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        HyperPay members renew automatically when webhooks are configured. First payment is recorded at checkout; later charges extend <strong>Current Period</strong> via webhook.
        Players with an active subscription cannot start a duplicate checkout.
      </p>
      <div className="bg-card border rounded-lg p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={statusFilter || 'all'} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Provider</Label>
          <Select value={providerFilter || 'all'} onValueChange={v => setProviderFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="hyperpay">HyperPay</SelectItem>
              <SelectItem value="apple">Apple</SelectItem>
              <SelectItem value="google">Google</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={applyFilters} className="gap-2"><RefreshCw className="w-4 h-4" />Apply</Button>
      </div>

      <DataTable
        columns={columns}
        data={subscriptions}
        isLoading={isLoading}
        pagination={data ? {
          total: data.total,
          limit,
          offset,
          onChange: o => o > offset ? goToNextPage() : goToPrevPage(),
        } : undefined}
        emptyMessage="No subscriptions found for the selected filters."
      />

      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel Subscription"
        description="Auto-renew is turned off and benefits remain until the end of the current period. For HyperPay website billing, the recurring schedule is also stopped."
        confirmLabel="Cancel Subscription"
        variant="destructive"
        isLoading={cancelMutation.isPending}
        onConfirm={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  )
}

// ─── HyperPay billing tab ─────────────────────────────────────────────────────

function BillingTab() {
  const { toast } = useToast()

  return (
    <div className="space-y-4 max-w-3xl">
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-amber-900">
            <AlertTriangle className="w-4 h-4" />
            Renewals require HyperPay webhooks
          </CardTitle>
          <CardDescription className="text-amber-800/80">
            The first subscription payment works through checkout, but <strong>automatic renewals will not extend</strong>{' '}
            <code className="text-xs bg-amber-100 px-1 rounded">current_period_end</code> unless webhooks are configured.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Webhook className="w-4 h-4" />
            Webhook setup (HyperPay portal)
          </CardTitle>
          <CardDescription>Administration → Webhooks in the HyperPay merchant portal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">URL</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1.5 rounded flex-1 break-all">{HYPERPAY_WEBHOOK_URL}</code>
                <Button type="button" size="sm" variant="outline" onClick={() => copyText(HYPERPAY_WEBHOOK_URL, toast)}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Event types</p>
              <div className="flex gap-2">
                <Badge variant="secondary">PAYMENTS</Badge>
                <Badge variant="secondary">SCHEDULES</Badge>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Wrapper</p>
              <p>JSON or None (both supported)</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Secret → server env</p>
              <code className="text-xs bg-muted px-2 py-1 rounded">HYPERPAY_WEBHOOK_SECRET</code>
              <p className="text-xs text-muted-foreground mt-1">64-character hex AES key from HyperPay webhook settings</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Server environment (ops)
          </CardTitle>
          <CardDescription>
            Online payment has no admin API — configure on the API server. Shares checkout settings with subscriptions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-xs font-mono">
            {[
              'HYPERPAY_ENABLED',
              'HYPERPAY_BASE_URL',
              'HYPERPAY_ACCESS_TOKEN',
              'HYPERPAY_ENTITY_ID_CARDS',
              'HYPERPAY_ENTITY_ID_APPLE_PAY',
              'HYPERPAY_CURRENCY',
              'HYPERPAY_WEBHOOK_SECRET',
            ].map(key => (
              <div key={key} className="flex items-center justify-between gap-4 border-b border-dashed pb-1.5 last:border-0">
                <span>{key}</span>
                {key === 'HYPERPAY_WEBHOOK_SECRET' && <Badge variant="outline" className="text-[10px] font-sans">required for renewals</Badge>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What happens on renewal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <Receipt className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
            <p>Records a <Link to="/financials" className="text-primary hover:underline">financial transaction</Link> (idempotent by HyperPay payment id).</p>
          </div>
          <div className="flex gap-3">
            <Clock className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
            <p>Extends <code className="text-xs bg-muted px-1 rounded">current_period_end</code> by one billing period (monthly or annual).</p>
          </div>
          <div className="flex gap-3">
            <Bell className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
            <p>Sends a <code className="text-xs bg-muted px-1 rounded">subscription_renewed</code> push notification to the player.</p>
          </div>
          <div className="flex gap-3">
            <RefreshCw className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
            <p>
              Background worker retries failed HyperPay <strong>schedule creation</strong> every 15 minutes after activation.
              Another worker expires subscriptions when the period ends.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SubscriptionsPage() {
  return (
    <div>
      <PageHeader
        title="Subscriptions"
        subtitle="Plans, subscriber benefits, members, and HyperPay renewal billing"
      />
      <Tabs defaultValue="plans">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="benefits">Benefits</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="billing">HyperPay Billing</TabsTrigger>
        </TabsList>
        <TabsContent value="plans"><PlansTab /></TabsContent>
        <TabsContent value="benefits"><BenefitsTab /></TabsContent>
        <TabsContent value="members"><MembersTab /></TabsContent>
        <TabsContent value="billing"><BillingTab /></TabsContent>
      </Tabs>
    </div>
  )
}
