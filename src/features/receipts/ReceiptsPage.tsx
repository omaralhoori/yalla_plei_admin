import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { RefreshCw, Check, X, Receipt as ReceiptIcon, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import DataTable, { type Column } from '@/components/shared/DataTable'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import { useToast } from '@/hooks/use-toast'
import { usePagination } from '@/hooks/usePagination'
import { api } from '@/lib/api'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type {
  ApiResponse, PaginatedResponse, PaymentReceipt,
  ApproveReceiptPayload, RejectReceiptPayload,
} from '@/types/api'

const approveSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  note: z.string().optional(),
})
type ApproveFormValues = z.infer<typeof approveSchema>

const rejectSchema = z.object({
  note: z.string().min(3, 'Please provide a reason'),
})
type RejectFormValues = z.infer<typeof rejectSchema>

export default function ReceiptsPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { offset, limit, goToNextPage, goToPrevPage, reset } = usePagination(20)

  const [statusFilter, setStatusFilter] = useState('pending')
  const [userIdFilter, setUserIdFilter] = useState('')
  const [applied, setApplied] = useState({ status: 'pending', user_id: '' })

  const [previewTarget, setPreviewTarget] = useState<PaymentReceipt | null>(null)
  const [approveTarget, setApproveTarget] = useState<PaymentReceipt | null>(null)
  const [rejectTarget, setRejectTarget] = useState<PaymentReceipt | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['receipts', offset, limit, applied],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (applied.status) params.set('status', applied.status)
      if (applied.user_id) params.set('user_id', applied.user_id)
      const res = await api.get<ApiResponse<PaginatedResponse<PaymentReceipt>>>(`/admin/receipts?${params}`)
      return res.data.data
    },
  })

  const approveForm = useForm<ApproveFormValues>({
    resolver: zodResolver(approveSchema),
    defaultValues: { amount: 0, note: '' },
  })

  const rejectForm = useForm<RejectFormValues>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { note: '' },
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ApproveReceiptPayload }) =>
      api.post(`/admin/receipts/${id}/approve`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receipts'] })
      toast({ title: 'Receipt approved — wallet credited', variant: 'success' as never })
      setApproveTarget(null)
    },
    onError: () => toast({ title: 'Failed to approve receipt', variant: 'destructive' }),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RejectReceiptPayload }) =>
      api.post(`/admin/receipts/${id}/reject`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receipts'] })
      toast({ title: 'Receipt rejected', variant: 'success' as never })
      setRejectTarget(null)
    },
    onError: () => toast({ title: 'Failed to reject receipt', variant: 'destructive' }),
  })

  function applyFilters() {
    reset()
    setApplied({ status: statusFilter, user_id: userIdFilter })
  }

  function openApprove(r: PaymentReceipt) {
    setApproveTarget(r)
    approveForm.reset({ amount: r.amount, note: '' })
  }

  function openReject(r: PaymentReceipt) {
    setRejectTarget(r)
    rejectForm.reset({ note: '' })
  }

  function onApproveSubmit(v: ApproveFormValues) {
    if (!approveTarget) return
    approveMutation.mutate({ id: approveTarget.id, payload: { amount: v.amount, note: v.note || undefined } })
  }

  function onRejectSubmit(v: RejectFormValues) {
    if (!rejectTarget) return
    rejectMutation.mutate({ id: rejectTarget.id, payload: { note: v.note } })
  }

  const playerName = (r: PaymentReceipt) =>
    r.user ? `${r.user.first_name} ${r.user.last_name}` : 'Unknown'

  const columns: Column<PaymentReceipt>[] = [
    {
      key: 'player',
      header: 'Player',
      cell: row => (
        <div>
          <div className="font-medium text-sm">{playerName(row)}</div>
          <div className="text-xs text-muted-foreground">{row.user?.email}</div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Submitted',
      cell: row => <span className="font-semibold text-sm">{formatCurrency(row.amount)}</span>,
    },
    {
      key: 'approved_amount',
      header: 'Credited',
      cell: row => row.approved_amount != null
        ? <span className="font-semibold text-sm text-emerald-600">{formatCurrency(row.approved_amount)}</span>
        : <span className="text-xs text-muted-foreground">—</span>,
    },
    {
      key: 'note',
      header: 'Player Note',
      cell: row => <span className="text-sm text-muted-foreground truncate max-w-[180px] block">{row.note || '—'}</span>,
    },
    {
      key: 'receipt',
      header: 'Receipt',
      cell: row => (
        <button
          type="button"
          onClick={() => setPreviewTarget(row)}
          className="group relative"
        >
          <img src={row.image_url} alt="receipt" className="w-10 h-10 rounded-md object-cover border" />
        </button>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: row => <StatusBadge status={row.status} />,
    },
    {
      key: 'created_at',
      header: 'Submitted At',
      cell: row => <span className="text-sm text-muted-foreground">{formatDateTime(row.created_at)}</span>,
    },
    {
      key: 'actions',
      header: '',
      cell: row => row.status === 'pending' ? (
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="outline" className="text-emerald-600 gap-1" onClick={() => openApprove(row)}>
            <Check className="w-3.5 h-3.5" />Approve
          </Button>
          <Button size="sm" variant="outline" className="text-destructive gap-1" onClick={() => openReject(row)}>
            <X className="w-3.5 h-3.5" />Reject
          </Button>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground italic">
          {row.admin_note ? row.admin_note : 'Reviewed'}
        </span>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Payment Receipts" subtitle="Review player wallet top-up receipts and approve or reject them" />

      {/* Filters */}
      <div className="bg-card border rounded-lg p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={statusFilter || 'all'} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>User ID</Label>
          <Input
            placeholder="Filter by user ID..."
            value={userIdFilter}
            onChange={e => setUserIdFilter(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyFilters()}
            className="w-52"
          />
        </div>
        <Button onClick={applyFilters} className="gap-2">
          <RefreshCw className="w-4 h-4" />Apply
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        pagination={data ? {
          total: data.meta.total_count,
          limit,
          offset,
          onChange: o => o > offset ? goToNextPage() : goToPrevPage(),
        } : undefined}
        emptyMessage="No receipts found for the selected filters."
      />

      {/* Image preview dialog */}
      <Dialog open={!!previewTarget} onOpenChange={open => !open && setPreviewTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ReceiptIcon className="w-4 h-4" />
              Receipt — {previewTarget ? playerName(previewTarget) : ''}
            </DialogTitle>
            <DialogDescription>
              {previewTarget ? `Submitted ${formatCurrency(previewTarget.amount)} on ${formatDateTime(previewTarget.created_at)}` : ''}
            </DialogDescription>
          </DialogHeader>
          {previewTarget && (
            <div className="space-y-3">
              <img src={previewTarget.image_url} alt="receipt" className="w-full rounded-lg border max-h-[60vh] object-contain bg-muted" />
              <a
                href={previewTarget.image_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />Open full image
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve dialog */}
      <Dialog open={!!approveTarget} onOpenChange={open => !open && setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Receipt</DialogTitle>
            <DialogDescription>
              The credited amount will be added to {approveTarget ? playerName(approveTarget) : ''}&apos;s wallet.
              Adjust the amount if it differs from the deposit.
            </DialogDescription>
          </DialogHeader>
          <Form {...approveForm}>
            <form onSubmit={approveForm.handleSubmit(onApproveSubmit)} className="space-y-4">
              <FormField control={approveForm.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount to credit (JOD)</FormLabel>
                  <FormControl><Input type="number" step="0.01" min="0.01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={approveForm.control} name="note" render={({ field }) => (
                <FormItem>
                  <FormLabel>Admin note (optional)</FormLabel>
                  <FormControl><Textarea rows={2} placeholder="e.g. Verified against bank statement" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setApproveTarget(null)}>Cancel</Button>
                <Button type="submit" disabled={approveMutation.isPending} className="gap-1.5">
                  <Check className="w-4 h-4" />
                  {approveMutation.isPending ? 'Approving…' : 'Approve & Credit'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={open => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Receipt</DialogTitle>
            <DialogDescription>
              Nothing will be credited. The reason is shown to {rejectTarget ? playerName(rejectTarget) : 'the player'}.
            </DialogDescription>
          </DialogHeader>
          <Form {...rejectForm}>
            <form onSubmit={rejectForm.handleSubmit(onRejectSubmit)} className="space-y-4">
              <FormField control={rejectForm.control} name="note" render={({ field }) => (
                <FormItem>
                  <FormLabel>Rejection reason</FormLabel>
                  <FormControl><Textarea rows={3} placeholder="e.g. Receipt is unreadable, please re-upload" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
                <Button type="submit" variant="destructive" disabled={rejectMutation.isPending} className="gap-1.5">
                  <X className="w-4 h-4" />
                  {rejectMutation.isPending ? 'Rejecting…' : 'Reject'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
