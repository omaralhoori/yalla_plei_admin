import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Construction, Hourglass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import type { ApiResponse, CancellationPolicy, PolicyPayload, AppSetting } from '@/types/api'

const WAITLIST_OFFER_KEY = 'waitlist_offer_duration_minutes'

const policySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description_en: z.string().min(1, 'English description is required'),
  description_ar: z.string().min(1, 'Arabic description is required'),
  cancel_before_hours: z.coerce.number().int().min(0, 'Must be 0 or more hours'),
  is_default: z.boolean(),
})

type PolicyFormValues = z.infer<typeof policySchema>

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
    defaultValues: { name: '', description_en: '', description_ar: '', cancel_before_hours: 24, is_default: false },
  })

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

  function openCreate() { setEditTarget(null); form.reset(); setSheetOpen(true) }
  function openEdit(p: CancellationPolicy) {
    setEditTarget(p)
    form.reset({ name: p.name, description_en: p.description_en, description_ar: p.description_ar, cancel_before_hours: p.cancel_before_hours, is_default: p.is_default })
    setSheetOpen(true)
  }
  function onSubmit(v: PolicyFormValues) {
    if (editTarget) updateMutation.mutate({ id: editTarget.id, payload: v })
    else createMutation.mutate(v)
  }

  const isBusy = createMutation.isPending || updateMutation.isPending

  const columns: Column<CancellationPolicy>[] = [
    { key: 'name', header: 'Name', cell: row => <div className="font-medium">{row.name}{row.is_default && <Badge variant="secondary" className="ml-2 text-xs">Default</Badge>}</div> },
    { key: 'desc', header: 'Description', cell: row => <span className="text-sm text-muted-foreground">{row.description_en}</span> },
    { key: 'hours', header: 'Cancel Before', cell: row => <span>{row.cancel_before_hours} hour{row.cancel_before_hours !== 1 ? 's' : ''}</span> },
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
        <SheetContent>
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
              <FormField control={form.control} name="cancel_before_hours" render={({ field }) => (
                <FormItem><FormLabel>Cancel Before (hours)</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
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
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="app">App Config</TabsTrigger>
        </TabsList>
        <TabsContent value="policies"><PoliciesTab /></TabsContent>
        <TabsContent value="waitlist"><WaitlistTab /></TabsContent>
        <TabsContent value="notifications"><ComingSoonTab label="Notification" /></TabsContent>
        <TabsContent value="app"><ComingSoonTab label="App" /></TabsContent>
      </Tabs>
    </div>
  )
}
