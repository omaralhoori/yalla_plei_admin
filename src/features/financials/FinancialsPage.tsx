import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, subDays } from 'date-fns'
import { RefreshCw, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import DataTable, { type Column } from '@/components/shared/DataTable'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useToast } from '@/hooks/use-toast'
import { usePagination } from '@/hooks/usePagination'
import { api } from '@/lib/api'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { ApiResponse, FinancialTransaction, ManualRefundPayload } from '@/types/api'

const refundSchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  description: z.string().min(5, 'Please provide a reason (min 5 chars)'),
})

type RefundFormValues = z.infer<typeof refundSchema>

export default function FinancialsPage() {
  const { toast } = useToast()
  const { offset, limit, reset } = usePagination(20)
  const [statusFilter, setStatusFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [appliedFilters, setAppliedFilters] = useState({ status: '', source: '', from: fromDate, to: toDate })
  const [refundTarget, setRefundTarget] = useState<FinancialTransaction | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingRefund, setPendingRefund] = useState<RefundFormValues | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', offset, limit, appliedFilters],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (appliedFilters.status) params.set('status', appliedFilters.status)
      if (appliedFilters.source) params.set('source', appliedFilters.source)
      if (appliedFilters.from) params.set('from', appliedFilters.from)
      if (appliedFilters.to) params.set('to', appliedFilters.to)
      const res = await api.get<ApiResponse<FinancialTransaction[]>>(`/admin/transactions?${params}`)
      return res.data.data
    },
  })

  const form = useForm<RefundFormValues>({
    resolver: zodResolver(refundSchema),
    defaultValues: { user_id: '', amount: 0, description: '' },
  })

  const refundMutation = useMutation({
    mutationFn: (payload: ManualRefundPayload) => api.post('/admin/payments/manual-refund', payload),
    onSuccess: () => {
      toast({ title: 'Manual refund applied successfully', variant: 'success' as never })
      setConfirmOpen(false)
      setRefundTarget(null)
      setPendingRefund(null)
    },
    onError: () => toast({ title: 'Refund failed', variant: 'destructive' }),
  })

  function openRefundDialog(tx: FinancialTransaction) {
    setRefundTarget(tx)
    form.reset({ user_id: tx.user_id, amount: tx.amount, description: `Manual refund for transaction ${tx.transaction_id}` })
  }

  function onRefundSubmit(values: RefundFormValues) {
    setPendingRefund(values)
    setConfirmOpen(true)
  }

  function applyFilters() {
    reset()
    setAppliedFilters({ status: statusFilter, source: sourceFilter, from: fromDate, to: toDate })
  }

  const transactions = Array.isArray(data) ? data : []

  const columns: Column<FinancialTransaction>[] = [
    {
      key: 'user',
      header: 'User',
      cell: row => (
        <div>
          <div className="font-medium text-sm">{row.user?.name ?? 'Unknown'}</div>
          <div className="text-xs text-muted-foreground">{row.user?.email}</div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      cell: row => (
        <span className={`font-semibold ${row.amount >= 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
          {formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      cell: row => (
        <span className="capitalize">{row.source}{row.last_4_digits ? ` •••• ${row.last_4_digits}` : ''}</span>
      ),
    },
    { key: 'status', header: 'Status', cell: row => <StatusBadge status={row.status} /> },
    { key: 'date', header: 'Date', cell: row => <span className="text-sm">{formatDateTime(row.created_at)}</span> },
    { key: 'txn_id', header: 'Transaction ID', cell: row => <code className="text-xs bg-muted px-1 py-0.5 rounded">{row.transaction_id}</code> },
    {
      key: 'actions',
      header: '',
      cell: row => (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          onClick={() => openRefundDialog(row)}
        >
          <DollarSign className="w-3.5 h-3.5" />
          Refund
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Financials" subtitle="View transactions and issue manual refunds" />

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-36"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Source</Label>
          <Select value={sourceFilter} onValueChange={v => setSourceFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-36"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="wallet">Wallet</SelectItem>
              <SelectItem value="apple_pay">Apple Pay</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>From</Label>
          <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label>To</Label>
          <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-40" />
        </div>
        <Button onClick={applyFilters} className="gap-2">
          <RefreshCw className="w-4 h-4" />Apply
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={transactions}
        isLoading={isLoading}
        pagination={undefined}
        emptyMessage="No transactions found for the selected filters."
      />

      {/* Manual Refund Dialog */}
      <Dialog open={!!refundTarget && !confirmOpen} onOpenChange={open => !open && setRefundTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual Refund</DialogTitle>
            <DialogDescription>
              Credit an amount to the user&apos;s wallet. This action is logged and cannot be reversed via this panel.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onRefundSubmit)} className="space-y-4">
              <FormField control={form.control} name="user_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>User ID</FormLabel>
                  <FormControl><Input {...field} readOnly className="bg-muted" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Refund Amount (JOD)</FormLabel>
                  <FormControl><Input type="number" step="0.01" min="0.01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl><Input placeholder="Reason for manual refund..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setRefundTarget(null)}>Cancel</Button>
                <Button type="submit">Review Refund</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm Manual Refund"
        description={`You are about to refund ${pendingRefund ? formatCurrency(pendingRefund.amount) : ''} to user ${pendingRefund?.user_id}. Reason: "${pendingRefund?.description}". This will credit their wallet immediately.`}
        confirmLabel="Apply Refund"
        variant="default"
        isLoading={refundMutation.isPending}
        onConfirm={() => pendingRefund && refundMutation.mutate(pendingRefund)}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
