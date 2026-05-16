import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import DataTable, { type Column } from '@/components/shared/DataTable'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useToast } from '@/hooks/use-toast'
import { usePagination } from '@/hooks/usePagination'
import { api } from '@/lib/api'
import { formatCurrency, formatDateTime, formatDate } from '@/lib/utils'
import type { ApiResponse, PaginatedResponse, AdminBooking, CancelBookingPayload } from '@/types/api'

export default function BookingsPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { offset, limit, goToNextPage, goToPrevPage, reset } = usePagination(20)

  const [statusFilter, setStatusFilter] = useState('')
  const [matchIdFilter, setMatchIdFilter] = useState('')
  const [applied, setApplied] = useState({ status: '', match_id: '' })

  const [cancelTarget, setCancelTarget] = useState<AdminBooking | null>(null)
  const [refundOnCancel, setRefundOnCancel] = useState(true)

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', offset, limit, applied],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (applied.status) params.set('status', applied.status)
      if (applied.match_id) params.set('match_id', applied.match_id)
      const res = await api.get<ApiResponse<PaginatedResponse<AdminBooking>>>(`/admin/bookings?${params}`)
      return res.data.data
    },
  })

  const cancelMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CancelBookingPayload }) =>
      api.post(`/admin/bookings/${id}/cancel`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      toast({ title: 'Booking cancelled successfully', variant: 'success' as never })
      setCancelTarget(null)
    },
    onError: () => toast({ title: 'Failed to cancel booking', variant: 'destructive' }),
  })

  function applyFilters() {
    reset()
    setApplied({ status: statusFilter, match_id: matchIdFilter })
  }

  const bookings = data?.items ?? []

  const columns: Column<AdminBooking>[] = [
    {
      key: 'player',
      header: 'Player',
      cell: row => (
        <div>
          <div className="font-medium text-sm">{row.player?.name ?? 'Unknown'}</div>
          <div className="text-xs text-muted-foreground">{row.player?.email}</div>
        </div>
      ),
      csvValue: row => row.player?.name ?? '',
    },
    {
      key: 'match',
      header: 'Match',
      cell: row => row.match ? (
        <div>
          <div className="text-sm font-medium">{row.match.pitch?.name_en ?? '—'}</div>
          <div className="text-xs text-muted-foreground">
            {formatDate(row.match.date)} {row.match.time}
          </div>
        </div>
      ) : <span className="text-muted-foreground">—</span>,
      csvValue: row => row.match?.pitch?.name_en ?? '',
    },
    {
      key: 'status',
      header: 'Status',
      cell: row => <StatusBadge status={row.status} />,
      csvValue: row => row.status,
    },
    {
      key: 'amount',
      header: 'Price / Slot',
      cell: row => <span className="font-semibold">{formatCurrency(row.match?.join_price ?? 0)}</span>,
      csvValue: row => row.match?.join_price ?? 0,
    },
    {
      key: 'date',
      header: 'Booked At',
      cell: row => <span className="text-sm">{formatDateTime(row.date_time)}</span>,
      csvValue: row => formatDateTime(row.date_time),
    },
    {
      key: 'actions',
      header: '',
      cell: row => (
        row.status !== 'cancelled' ? (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs text-destructive hover:text-destructive"
            onClick={() => { setCancelTarget(row); setRefundOnCancel(true) }}
          >
            <XCircle className="w-3.5 h-3.5" />
            Force Cancel
          </Button>
        ) : null
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Bookings" subtitle="View and manage all match bookings" />

      <div className="bg-card border rounded-lg p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Match ID</Label>
          <Input
            placeholder="Filter by match ID..."
            value={matchIdFilter}
            onChange={e => setMatchIdFilter(e.target.value)}
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
        data={bookings}
        isLoading={isLoading}
        pagination={data ? {
          total: data.meta.total_count,
          limit,
          offset,
          onChange: o => o > offset ? goToNextPage() : goToPrevPage(),
        } : undefined}
        emptyMessage="No bookings found for the selected filters."
        csvFilename="bookings"
      />

      <ConfirmDialog
        open={!!cancelTarget}
        title="Force Cancel Booking"
        description={
          <div className="space-y-3">
            <p>
              Cancel booking for <strong>{cancelTarget?.player?.name}</strong>?
              Price: <strong>{formatCurrency(cancelTarget?.match?.join_price ?? 0)}</strong>.
            </p>
            <div className="flex items-center gap-3">
              <Switch
                id="refund-toggle"
                checked={refundOnCancel}
                onCheckedChange={setRefundOnCancel}
              />
              <label htmlFor="refund-toggle" className="text-sm cursor-pointer">
                Issue refund to wallet
              </label>
            </div>
          </div>
        }
        confirmLabel="Cancel Booking"
        variant="destructive"
        isLoading={cancelMutation.isPending}
        onConfirm={() => cancelTarget && cancelMutation.mutate({ id: cancelTarget.id, payload: { refund: refundOnCancel } })}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  )
}
