import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import { Users, MousePointerClick, UserPlus, Activity, RefreshCw, X, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import DataTable, { type Column } from '@/components/shared/DataTable'
import PageHeader from '@/components/shared/PageHeader'
import { usePagination } from '@/hooks/usePagination'
import { api } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import type { ApiResponse, PaginatedResponse, VisitVisitor, VisitorAnalyticsSummary } from '@/types/api'

interface AppliedFilters {
  from: string
  to: string
}

const EMPTY_FILTERS: AppliedFilters = { from: '', to: '' }

export default function VisitAnalyticsPage() {
  const { offset, limit, goToNextPage, goToPrevPage, reset } = usePagination(20)

  const [from, setFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [applied, setApplied] = useState<AppliedFilters>(EMPTY_FILTERS)

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['visitor-analytics-summary'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<VisitorAnalyticsSummary>>('/admin/analytics/visitors/summary')
      return res.data.data
    },
  })

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['visitor-analytics', offset, limit, applied],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (applied.from) params.set('from', applied.from)
      if (applied.to) params.set('to', applied.to)
      const res = await api.get<ApiResponse<PaginatedResponse<VisitVisitor>>>(
        `/admin/analytics/visitors?${params}`,
      )
      return res.data.data
    },
  })

  function applyFilters() {
    setApplied({ from, to })
    reset()
  }

  function clearFilters() {
    const defaultFrom = format(subDays(new Date(), 30), 'yyyy-MM-dd')
    const defaultTo = format(new Date(), 'yyyy-MM-dd')
    setFrom(defaultFrom)
    setTo(defaultTo)
    setApplied(EMPTY_FILTERS)
    reset()
  }

  const hasActiveFilters = !!(applied.from || applied.to)

  const columns: Column<VisitVisitor>[] = [
    {
      key: 'ip_address',
      header: 'IP Address',
      cell: row => <code className="text-xs bg-muted px-2 py-0.5 rounded">{row.ip_address}</code>,
    },
    {
      key: 'user',
      header: 'User',
      cell: row => row.user ? (
        <Link
          to={`/users/${row.user.id}`}
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          {row.user.first_name} {row.user.last_name}
          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100" />
        </Link>
      ) : (
        <span className="text-sm text-muted-foreground">Anonymous</span>
      ),
    },
    {
      key: 'visit_count',
      header: 'Visits',
      cell: row => <span className="font-semibold tabular-nums">{row.visit_count.toLocaleString()}</span>,
    },
    {
      key: 'platform',
      header: 'Platform',
      cell: row => row.platform
        ? <Badge variant="outline" className="capitalize text-xs">{row.platform}</Badge>
        : <span className="text-muted-foreground text-sm">—</span>,
    },
    {
      key: 'first_visit_at',
      header: 'First Visit',
      cell: row => <span className="text-sm text-muted-foreground">{formatDateTime(row.first_visit_at)}</span>,
    },
    {
      key: 'last_visit_at',
      header: 'Last Visit',
      cell: row => <span className="text-sm">{formatDateTime(row.last_visit_at)}</span>,
    },
    {
      key: 'user_agent',
      header: 'User Agent',
      cell: row => (
        <span className="text-xs text-muted-foreground truncate block max-w-[180px]" title={row.user_agent}>
          {row.user_agent ?? '—'}
        </span>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Visit Analytics"
        subtitle="Home screen opens tracked by unique IP — visit counts and daily summary"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          icon={Users}
          label="Unique Visitors"
          value={summaryLoading ? null : String(summary?.total_unique_visitors ?? 0)}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <SummaryCard
          icon={MousePointerClick}
          label="Total Visits"
          value={summaryLoading ? null : String(summary?.total_visits ?? 0)}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <SummaryCard
          icon={UserPlus}
          label="New Visitors Today"
          value={summaryLoading ? null : String(summary?.new_visitors_today ?? 0)}
          color="text-violet-600"
          bg="bg-violet-50"
        />
        <SummaryCard
          icon={Activity}
          label="Visits Today"
          value={summaryLoading ? null : String(summary?.visits_today ?? 0)}
          color="text-amber-600"
          bg="bg-amber-50"
        />
      </div>

      <div className="bg-card border rounded-lg p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label>Last visit from</Label>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label>Last visit to</Label>
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" />
        </div>
        <Button onClick={applyFilters} className="gap-2">
          <RefreshCw className="w-4 h-4" />Apply
        </Button>
        {hasActiveFilters && (
          <Button variant="outline" onClick={clearFilters} className="gap-2">
            <X className="w-4 h-4" />Clear
          </Button>
        )}
      </div>

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
        emptyMessage="No visitors match the selected date range."
      />
    </div>
  )
}

interface SummaryCardProps {
  icon: React.ElementType
  label: string
  value: string | null
  color: string
  bg: string
}

function SummaryCard({ icon: Icon, label, value, color, bg }: SummaryCardProps) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            {value === null
              ? <Skeleton className="h-5 w-12 mt-0.5" />
              : <p className="font-bold text-sm leading-none mt-0.5">{value}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
