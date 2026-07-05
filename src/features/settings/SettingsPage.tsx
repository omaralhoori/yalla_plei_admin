import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Construction, Hourglass, Landmark, Clock, MessageSquareText, Shield, Cake } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import DataTable, { type Column } from '@/components/shared/DataTable'
import PageHeader from '@/components/shared/PageHeader'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'
import type { ApiResponse, CancellationPolicy, PolicyPayload, AppSetting, PointRule, PointRulePayload, BirthdayMessages, BirthdayMessagesPayload } from '@/types/api'

const WAITLIST_OFFER_KEY = 'waitlist_offer_duration_minutes'
const DEPOSIT_INSTRUCTIONS_KEY = 'deposit_instructions'
const REGISTRATION_INSTRUCTIONS_KEY = 'registration_instructions'
const GOALKEEPER_DISCOUNT_KEY = 'goalkeeper_discount_percent'
const GOALKEEPER_POINT_RULE_KEY = 'goalkeeper_participation'
const BIRTHDAY_PUSH_TITLE_KEY = 'birthday_push_title'
const BIRTHDAY_PUSH_BODY_KEY = 'birthday_push_body'
const BIRTHDAY_SMS_KEY = 'birthday_sms_message'

const DEFAULT_BIRTHDAY_MESSAGES: BirthdayMessages = {
  push_title: 'عيد ميلاد سعيد! 🎂',
  push_body: 'كل عام وأنت بخير يا {name}! نتمنى لك عاماً مليان بطولات على الملعب — يلا بلّع',
  sms_message: 'يلا بلّع: عيد ميلاد سعيد يا {name}! كل عام وأنت بخير 🎂',
}

const refundTierSchema = z.object({
  hours_before: z.coerce.number().int('Whole number').min(0, 'Must be 0 or more'),
  refund_percent: z.coerce.number().min(0, 'Min 0').max(100, 'Max 100'),
})

const policySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description_en: z.string().min(1, 'English description is required'),
  description_ar: z.string().min(1, 'Arabic description is required'),
  cancel_before_hours: z.coerce.number().int().min(0, 'Must be 0 or more hours'),
  is_default: z.boolean(),
  refund_tiers: z.array(refundTierSchema),
}).superRefine((val, ctx) => {
  const seen = new Map<number, number>()
  val.refund_tiers.forEach((tier, index) => {
    if (seen.has(tier.hours_before)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Duplicate hours-before value',
        path: ['refund_tiers', index, 'hours_before'],
      })
    }
    seen.set(tier.hours_before, index)
  })
})

type PolicyFormValues = z.infer<typeof policySchema>

const DEFAULT_POLICY_VALUES: PolicyFormValues = {
  name: '',
  description_en: '',
  description_ar: '',
  cancel_before_hours: 24,
  is_default: false,
  refund_tiers: [],
}

function PoliciesTab() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<CancellationPolicy | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CancellationPolicy | null>(null)

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ['policies'],
    queryFn: async () => (await api.get<ApiResponse<CancellationPolicy[]>>('/admin/policies')).data.data,
  })

  const form = useForm<PolicyFormValues>({
    resolver: zodResolver(policySchema),
    defaultValues: DEFAULT_POLICY_VALUES,
  })

  const tiers = useFieldArray({ control: form.control, name: 'refund_tiers' })

  const createMutation = useMutation({
    mutationFn: (payload: PolicyPayload) => api.post('/admin/policies', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['policies'] }); toast({ title: 'Policy created', variant: 'success' as never }); setSheetOpen(false) },
    onError: () => toast({ title: 'Failed to create policy', variant: 'destructive' }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PolicyPayload }) => api.put(`/admin/policies/${id}`, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['policies'] }); toast({ title: 'Policy updated', variant: 'success' as never }); setSheetOpen(false) },
    onError: () => toast({ title: 'Failed to update policy', variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/policies/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['policies'] }); toast({ title: 'Policy deleted', variant: 'success' as never }); setDeleteTarget(null) },
    onError: () => toast({ title: 'Failed to delete policy', variant: 'destructive' }),
  })

  function openCreate() { setEditTarget(null); form.reset(DEFAULT_POLICY_VALUES); setSheetOpen(true) }
  function openEdit(p: CancellationPolicy) {
    setEditTarget(p)
    form.reset({
      name: p.name,
      description_en: p.description_en,
      description_ar: p.description_ar,
      cancel_before_hours: p.cancel_before_hours,
      is_default: p.is_default,
      refund_tiers: (p.refund_tiers ?? []).map(t => ({ hours_before: t.hours_before, refund_percent: t.refund_percent })),
    })
    setSheetOpen(true)
  }
  function onSubmit(v: PolicyFormValues) {
    // Send tiers ordered by hours_before descending to match how the API returns them.
    const payload: PolicyPayload = {
      ...v,
      refund_tiers: [...v.refund_tiers].sort((a, b) => b.hours_before - a.hours_before),
    }
    if (editTarget) updateMutation.mutate({ id: editTarget.id, payload })
    else createMutation.mutate(payload)
  }

  const isBusy = createMutation.isPending || updateMutation.isPending

  const columns: Column<CancellationPolicy>[] = [
    { key: 'name', header: 'Name', cell: row => <div className="font-medium">{row.name}{row.is_default && <Badge variant="secondary" className="ml-2 text-xs">Default</Badge>}</div> },
    { key: 'desc', header: 'Description', cell: row => <span className="text-sm text-muted-foreground">{row.description_en}</span> },
    {
      key: 'tiers',
      header: 'Refund Tiers',
      cell: row => {
        const t = row.refund_tiers ?? []
        if (t.length === 0) {
          return (
            <span className="text-xs text-muted-foreground">
              Legacy — 100% before {row.cancel_before_hours}h
            </span>
          )
        }
        return (
          <div className="flex flex-wrap gap-1.5">
            {[...t].sort((a, b) => b.hours_before - a.hours_before).map((tier, i) => (
              <Badge key={i} variant="outline" className="font-normal gap-1">
                <Clock className="w-3 h-3" />
                {tier.hours_before}h → {tier.refund_percent}%
              </Badge>
            ))}
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
      <div className="flex justify-end mb-4">
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Policy</Button>
      </div>
      <DataTable columns={columns} data={policies} isLoading={isLoading} />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader><SheetTitle>{editTarget ? 'Edit Policy' : 'Add Policy'}</SheetTitle></SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description_en" render={({ field }) => (
                <FormItem><FormLabel>Description (English)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description_ar" render={({ field }) => (
                <FormItem><FormLabel>Description (Arabic)</FormLabel><FormControl><Input dir="rtl" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              {/* ── Refund tiers ─────────────────────────────────────────── */}
              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Label className="text-sm font-medium">Refund Tiers</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Refund % based on hours remaining before kickoff. The tier with the largest
                      hours-before that doesn't exceed the time left applies.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1"
                    onClick={() => tiers.append({ hours_before: 0, refund_percent: 0 })}
                  >
                    <Plus className="w-3.5 h-3.5" />Add tier
                  </Button>
                </div>

                {tiers.fields.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    No tiers — the legacy single deadline below will be used (100% before it, 0% after).
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2 px-1 text-[11px] font-medium text-muted-foreground">
                      <span className="flex-1">Hours before kickoff</span>
                      <span className="flex-1">Refund %</span>
                      <span className="w-8" />
                    </div>
                    {tiers.fields.map((tierField, index) => (
                      <div key={tierField.id} className="flex items-start gap-2">
                        <FormField control={form.control} name={`refund_tiers.${index}.hours_before`} render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl><Input type="number" min="0" step="1" placeholder="e.g. 8" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`refund_tiers.${index}.refund_percent`} render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl><Input type="number" min="0" max="100" step="1" placeholder="0–100" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-destructive shrink-0"
                          onClick={() => tiers.remove(index)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <FormField control={form.control} name="cancel_before_hours" render={({ field }) => (
                <FormItem>
                  <FormLabel>Legacy Deadline (hours)</FormLabel>
                  <FormControl><Input type="number" min="0" {...field} /></FormControl>
                  <p className="text-xs text-muted-foreground">Used only when no refund tiers are defined above.</p>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="is_default" render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="!mt-0">Set as default policy</FormLabel>
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
        title="Delete Policy"
        description={`Delete "${deleteTarget?.name}"?`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

// ─── Waitlist settings ──────────────────────────────────────────────────────

const waitlistSchema = z.object({
  minutes: z.coerce.number().int('Must be a whole number').positive('Must be greater than 0'),
})
type WaitlistFormValues = z.infer<typeof waitlistSchema>

function WaitlistTab() {
  const qc = useQueryClient()
  const { toast } = useToast()

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => (await api.get<ApiResponse<AppSetting[]>>('/admin/settings')).data.data,
  })

  const current = settings.find(s => s.key === WAITLIST_OFFER_KEY)
  const currentMinutes = current ? Number(current.value) : 30

  const form = useForm<WaitlistFormValues>({
    resolver: zodResolver(waitlistSchema),
    values: { minutes: currentMinutes },
  })

  const updateMutation = useMutation({
    mutationFn: (payload: { minutes: number }) =>
      api.put('/admin/settings/waitlist-offer-duration', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-settings'] })
      toast({ title: 'Waitlist offer duration updated', variant: 'success' as never })
    },
    onError: () => toast({ title: 'Failed to update setting', variant: 'destructive' }),
  })

  function onSubmit(v: WaitlistFormValues) {
    updateMutation.mutate({ minutes: v.minutes })
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Hourglass className="w-4 h-4" />
          Waitlist Offer Duration
        </CardTitle>
        <CardDescription>
          When a confirmed seat frees up, it's offered to the next waitlisted player. This is how long
          they have to book before the offer passes to the next person in the queue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-10 w-full max-w-xs" />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="minutes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Offer window (minutes)</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-3">
                      <Input type="number" min="1" step="1" className="max-w-[140px]" {...field} />
                      <span className="text-sm text-muted-foreground">minutes</span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving…' : 'Save'}
                </Button>
                <Label className="text-xs text-muted-foreground font-normal">
                  Current: {currentMinutes} minute{currentMinutes !== 1 ? 's' : ''}
                </Label>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Deposit instructions settings ──────────────────────────────────────────

const depositSchema = z.object({
  instructions: z.string(),
})
type DepositFormValues = z.infer<typeof depositSchema>

function DepositInstructionsTab() {
  const qc = useQueryClient()
  const { toast } = useToast()

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => (await api.get<ApiResponse<AppSetting[]>>('/admin/settings')).data.data,
  })

  const current = settings.find(s => s.key === DEPOSIT_INSTRUCTIONS_KEY)
  const currentValue = current?.value ?? ''

  const form = useForm<DepositFormValues>({
    resolver: zodResolver(depositSchema),
    values: { instructions: currentValue },
  })

  const updateMutation = useMutation({
    mutationFn: (payload: { instructions: string }) =>
      api.put('/admin/settings/deposit-instructions', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-settings'] })
      toast({ title: 'Deposit instructions updated', variant: 'success' as never })
    },
    onError: () => toast({ title: 'Failed to update instructions', variant: 'destructive' }),
  })

  function onSubmit(v: DepositFormValues) {
    updateMutation.mutate({ instructions: v.instructions })
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Landmark className="w-4 h-4" />
          Deposit Instructions
        </CardTitle>
        <CardDescription>
          Shown to players before they upload a wallet top-up receipt — typically your company's bank
          account details. Leave empty to clear it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-28 w-full" />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="instructions" render={({ field }) => (
                <FormItem>
                  <FormLabel>Message to players</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={5}
                      placeholder="e.g. Transfer the amount to Yalla Plei Co. — Bank ABC, IBAN JO00 0000 0000, then upload your receipt."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving…' : 'Save'}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Registration instructions settings ────────────────────────────────────

const registrationSchema = z.object({
  instructions: z.string(),
})
type RegistrationFormValues = z.infer<typeof registrationSchema>

function RegistrationInstructionsTab() {
  const qc = useQueryClient()
  const { toast } = useToast()

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => (await api.get<ApiResponse<AppSetting[]>>('/admin/settings')).data.data,
  })

  const current = settings.find(s => s.key === REGISTRATION_INSTRUCTIONS_KEY)
  const currentValue = current?.value ?? ''

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    values: { instructions: currentValue },
  })

  const updateMutation = useMutation({
    mutationFn: (payload: { instructions: string }) =>
      api.put('/admin/settings/registration-instructions', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-settings'] })
      toast({ title: 'Registration instructions updated', variant: 'success' as never })
    },
    onError: () => toast({ title: 'Failed to update instructions', variant: 'destructive' }),
  })

  function onSubmit(v: RegistrationFormValues) {
    updateMutation.mutate({ instructions: v.instructions })
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquareText className="w-4 h-4" />
          Registration Instructions
        </CardTitle>
        <CardDescription>
          Shown to players before they reserve a seat in the reserve-now / pay-later flow — the payment
          steps and where to send the transfer receipt (e.g. your company WhatsApp number). Leave empty to clear it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-28 w-full" />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="instructions" render={({ field }) => (
                <FormItem>
                  <FormLabel>Message to players</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={5}
                      placeholder="e.g. Reserve your seat, transfer the amount to IBAN JO00 0000 0000, then send the receipt to WhatsApp +962 7 0000 0000 for confirmation."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving…' : 'Save'}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Goalkeeper settings ──────────────────────────────────────────────────────

const goalkeeperDiscountSchema = z.object({
  percent: z.coerce.number().int('Must be a whole number').min(0, 'Min 0').max(100, 'Max 100'),
})
type GoalkeeperDiscountFormValues = z.infer<typeof goalkeeperDiscountSchema>

const goalkeeperPointsSchema = z.object({
  points: z.coerce.number().int().refine(v => v !== 0, { message: 'Points cannot be zero' }),
  subscriber_points: z.coerce.number().int(),
  is_enabled: z.boolean(),
})
type GoalkeeperPointsFormValues = z.infer<typeof goalkeeperPointsSchema>

function GoalkeeperTab() {
  const qc = useQueryClient()
  const { toast } = useToast()

  const { data: settings = [], isLoading: settingsLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => (await api.get<ApiResponse<AppSetting[]>>('/admin/settings')).data.data,
  })

  const { data: pointRules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['point-rules'],
    queryFn: async () => (await api.get<ApiResponse<PointRule[]>>('/admin/point-rules')).data.data,
  })

  const currentDiscount = settings.find(s => s.key === GOALKEEPER_DISCOUNT_KEY)
  const currentPercent = currentDiscount ? Number(currentDiscount.value) : 50

  const goalkeeperRule = pointRules.find(r => r.key === GOALKEEPER_POINT_RULE_KEY)

  const discountForm = useForm<GoalkeeperDiscountFormValues>({
    resolver: zodResolver(goalkeeperDiscountSchema),
    values: { percent: currentPercent },
  })

  const pointsForm = useForm<GoalkeeperPointsFormValues>({
    resolver: zodResolver(goalkeeperPointsSchema),
    values: goalkeeperRule
      ? { points: goalkeeperRule.points, subscriber_points: goalkeeperRule.subscriber_points ?? 0, is_enabled: goalkeeperRule.is_enabled }
      : undefined,
    defaultValues: { points: 5, subscriber_points: 8, is_enabled: true },
  })

  const discountMutation = useMutation({
    mutationFn: (payload: { percent: number }) => api.put('/admin/settings/goalkeeper-discount', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-settings'] })
      toast({ title: 'Goalkeeper discount updated', variant: 'success' as never })
    },
    onError: () => toast({ title: 'Failed to update discount', variant: 'destructive' }),
  })

  const pointsMutation = useMutation({
    mutationFn: (payload: PointRulePayload) => api.put(`/admin/point-rules/${GOALKEEPER_POINT_RULE_KEY}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['point-rules'] })
      toast({ title: 'Goalkeeper points rule updated', variant: 'success' as never })
    },
    onError: () => toast({ title: 'Failed to update points rule', variant: 'destructive' }),
  })

  function onDiscountSubmit(v: GoalkeeperDiscountFormValues) {
    discountMutation.mutate({ percent: v.percent })
  }

  function onPointsSubmit(v: GoalkeeperPointsFormValues) {
    pointsMutation.mutate(v)
  }

  const isLoading = settingsLoading || rulesLoading

  return (
    <div className="space-y-6 max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Goalkeeper Join Discount
          </CardTitle>
          <CardDescription>
            Percentage off the match join price when a player registers as goalkeeper. Applied after any
            level discount. Max 2 goalkeepers per match.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-10 w-full max-w-xs" />
          ) : (
            <Form {...discountForm}>
              <form onSubmit={discountForm.handleSubmit(onDiscountSubmit)} className="space-y-4">
                <FormField control={discountForm.control} name="percent" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount (%)</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-3">
                        <Input type="number" min="0" max="100" step="1" className="max-w-[140px]" {...field} />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={discountMutation.isPending}>
                    {discountMutation.isPending ? 'Saving…' : 'Save Discount'}
                  </Button>
                  <Label className="text-xs text-muted-foreground font-normal">
                    Current: {currentPercent}%
                  </Label>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Goalkeeper Participation (Monthly)</CardTitle>
          <CardDescription>
            Monthly competitive points awarded when a player attends as goalkeeper
            (<code className="text-xs bg-muted px-1 py-0.5 rounded">{GOALKEEPER_POINT_RULE_KEY}</code>).
            Also editable under Loyalty → Monthly Rules. Permanent XP for goalkeepers is under Loyalty → XP Rules.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : !goalkeeperRule ? (
            <p className="text-sm text-muted-foreground">Point rule not found — it should be seeded on server startup.</p>
          ) : (
            <Form {...pointsForm}>
              <form onSubmit={pointsForm.handleSubmit(onPointsSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={pointsForm.control} name="points" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Points (normal)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={pointsForm.control} name="subscriber_points" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Points (subscriber)</FormLabel>
                      <FormControl><Input type="number" {...field} placeholder="0 = same as normal" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={pointsForm.control} name="is_enabled" render={({ field }) => (
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
                <Button type="submit" disabled={pointsMutation.isPending}>
                  {pointsMutation.isPending ? 'Saving…' : 'Save Points Rule'}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function birthdayMessagesFromSettings(settings: AppSetting[]): BirthdayMessages {
  const get = (key: string, fallback: string) => settings.find(s => s.key === key)?.value ?? fallback
  return {
    push_title: get(BIRTHDAY_PUSH_TITLE_KEY, DEFAULT_BIRTHDAY_MESSAGES.push_title),
    push_body: get(BIRTHDAY_PUSH_BODY_KEY, DEFAULT_BIRTHDAY_MESSAGES.push_body),
    sms_message: get(BIRTHDAY_SMS_KEY, DEFAULT_BIRTHDAY_MESSAGES.sms_message),
  }
}

// ─── Birthday messages settings ───────────────────────────────────────────────

const birthdayMessagesSchema = z.object({
  push_title: z.string().min(1, 'Push title is required'),
  push_body: z.string().min(1, 'Push body is required'),
  sms_message: z.string().min(1, 'SMS message is required'),
})
type BirthdayMessagesFormValues = z.infer<typeof birthdayMessagesSchema>

function BirthdayMessagesTab() {
  const qc = useQueryClient()
  const { toast } = useToast()

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => (await api.get<ApiResponse<AppSetting[]>>('/admin/settings')).data.data,
  })

  const current = birthdayMessagesFromSettings(settings)

  const form = useForm<BirthdayMessagesFormValues>({
    resolver: zodResolver(birthdayMessagesSchema),
    values: current,
  })

  const updateMutation = useMutation({
    mutationFn: (payload: BirthdayMessagesPayload) =>
      api.put<ApiResponse<BirthdayMessages>>('/admin/settings/birthday-messages', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-settings'] })
      toast({ title: 'Birthday messages updated', variant: 'success' as never })
    },
    onError: () => toast({ title: 'Failed to update birthday messages', variant: 'destructive' }),
  })

  function onSubmit(v: BirthdayMessagesFormValues) {
    updateMutation.mutate(v)
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Cake className="w-4 h-4" />
          Birthday Greetings
        </CardTitle>
        <CardDescription>
          Templates for the daily birthday worker (runs at <strong>08:00 Asia/Amman</strong>). Users whose
          date of birth matches today receive a push notification and SMS (when a phone is on file).
          Use <code className="text-xs bg-muted px-1 py-0.5 rounded">{'{name}'}</code> for the player&apos;s first name.
          Each user is greeted at most once per calendar year.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="push_title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Push notification title</FormLabel>
                  <FormControl><Input dir="rtl" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="push_body" render={({ field }) => (
                <FormItem>
                  <FormLabel>Push notification body</FormLabel>
                  <FormControl><Textarea rows={3} dir="rtl" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="sms_message" render={({ field }) => (
                <FormItem>
                  <FormLabel>SMS message</FormLabel>
                  <FormControl><Textarea rows={3} dir="rtl" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving…' : 'Save Messages'}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  )
}

function ComingSoonTab({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-3">
      <Construction className="w-10 h-10" />
      <p className="font-medium">{label} settings coming soon</p>
      <p className="text-sm max-w-xs">This section is ready to be extended with additional configuration options.</p>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" subtitle="Platform configuration and policies" />
      <Tabs defaultValue="policies">
        <TabsList className="mb-4">
          <TabsTrigger value="policies">Cancellation Policies</TabsTrigger>
          <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
          <TabsTrigger value="deposit">Deposit Instructions</TabsTrigger>
          <TabsTrigger value="registration">Registration Instructions</TabsTrigger>
          <TabsTrigger value="goalkeeper">Goalkeeper</TabsTrigger>
          <TabsTrigger value="notifications">Birthday</TabsTrigger>
          <TabsTrigger value="app">App Config</TabsTrigger>
        </TabsList>
        <TabsContent value="policies"><PoliciesTab /></TabsContent>
        <TabsContent value="waitlist"><WaitlistTab /></TabsContent>
        <TabsContent value="deposit"><DepositInstructionsTab /></TabsContent>
        <TabsContent value="registration"><RegistrationInstructionsTab /></TabsContent>
        <TabsContent value="goalkeeper"><GoalkeeperTab /></TabsContent>
        <TabsContent value="notifications"><BirthdayMessagesTab /></TabsContent>
        <TabsContent value="app"><ComingSoonTab label="App" /></TabsContent>
      </Tabs>
    </div>
  )
}
