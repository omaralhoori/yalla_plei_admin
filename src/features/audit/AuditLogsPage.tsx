import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { RefreshCw, X, Copy, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import DataTable, { type Column } from '@/components/shared/DataTable'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import { useToast } from '@/hooks/use-toast'
import { usePagination } from '@/hooks/usePagination'
import { api } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import { SYSTEM_ACTOR_ID, type ApiResponse, type AuditLog, type PaginatedResponse } from '@/types/api'

// Common mutable tables surfaced by the audit log. Free-form `actor_id`/`record_id`
// inputs cover everything else.
const TABLE_OPTIONS = [
  'users',
  'matches',
  'match_templates',
  'bookings',
  'payment_receipts',
  'financial_transactions',
  'sports',
  'teams',
  'pitches',
  'services',
  'levels',
  'rewards',
  'point_rules',
  'highlights',
  'countries',
  'cities',
  'app_settings',
  'cancellation_policies',
] as const

const ALL = 'all'

interface AppliedFilters {
  table_name: string
  actor_id: string
  record_id: string
  from: string
  to: string
}

const EMPTY_FILTERS: AppliedFilters = {
  table_name: '',
  actor_id: '',
  record_id: '',
  from: '',
  to: '',
}

export default function AuditLogsPage() {
  const { toast } = useToast()
  const { offset, limit, goToNextPage, goToPrevPage, reset } = usePagination(20)

  const [tableName, setTableName] = useState('')
  const [actorId, setActorId] = useState('')
  const [recordId, setRecordId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [applied, setApplied] = useState<AppliedFilters>(EMPTY_FILTERS)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['audit-logs', offset, limit, applied],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (applied.table_name) params.set('table_name', applied.table_name)
      if (applied.actor_id) params.set('actor_id', applied.actor_id.trim())
      if (applied.record_id) params.set('record_id', applied.record_id.trim())
      if (applied.from) params.set('from', applied.from)
      if (applied.to) params.set('to', applied.to)
      const res = await api.get<ApiResponse<PaginatedResponse<AuditLog>>>(`/admin/audit-logs?${params}`)
      return res.data.data
    },
  })

  function applyFilters() {
    reset()
    setApplied({
      table_name: tableName,
      actor_id: actorId,
      record_id: recordId,
      from,
      to,
    })
  }

  function clearFilters() {
    setTableName('')
    setActorId('')
    setRecordId('')
    setFrom('')
    setTo('')
    reset()
    setApplied(EMPTY_FILTERS)
  }

  function copy(value: string) {
    navigator.clipboard?.writeText(value)
    toast({ title: 'Copied to clipboard', variant: 'success' as never })
  }

  const hasActiveFilters = Object.values(applied).some(Boolean)

  const columns: Column<AuditLog>[] = [
    {
      key: 'action',
      header: 'Action',
      cell: row => <StatusBadge status={row.action} />,
    },
    {
      key: 'table_name',
      header: 'Table',
      cell: row => <span className="font-mono text-sm">{row.table_name}</span>,
    },
    {
      key: 'record_id',
      header: 'Record',
      cell: row => (
        <button
          type="button"
          onClick={() => copy(row.record_id)}
          title="Click to copy record ID"
          className="group inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
        >
          <span className="truncate max-w-[140px]">{row.record_id}</span>
          <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 shrink-0" />
        </button>
      ),
    },
    {
      key: 'actor',
      header: 'Actor',
      cell: row => {
        const isSystem = row.actor_id === SYSTEM_ACTOR_ID || row.actor_name === 'system'
        if (isSystem) {
          return <span className="text-sm italic text-muted-foreground">system</span>
        }
        return (
          <Link
            to={`/users/${row.actor_id}`}
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            {row.actor_name || row.actor_id}
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100" />
          </Link>
        )
      },
    },
    {
      key: 'created_at',
      header: 'When',
      cell: row => <span className="text-sm text-muted-foreground">{formatDateTime(row.created_at)}</span>,
      csvValue: row => row.created_at,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        subtitle="Browse the full history of changes made by admins and the system across every table"
      />

      {/* Filters */}
      <div className="bg-card border rounded-lg p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label>Table</Label>
          <Select
            value={tableName || ALL}
            onValueChange={v => setTableName(v === ALL ? '' : v)}
          >
            <SelectTrigger className="w-48"><SelectValue placeholder="All tables" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All tables</SelectItem>
              {TABLE_OPTIONS.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Actor ID</Label>
          <Input
            placeholder="User UUID or 'system'"
            value={actorId}
            onChange={e => setActorId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyFilters()}
            className="w-56"
          />
        </div>

        <div className="space-y-1">
          <Label>Record ID</Label>
          <Input
            placeholder="Affected row UUID"
            value={recordId}
            onChange={e => setRecordId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyFilters()}
            className="w-56"
          />
        </div>

        <div className="space-y-1">
          <Label>From</Label>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" />
        </div>

        <div className="space-y-1">
          <Label>To</Label>
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
          onChange: o => o > offset ? goToNextPage() : goToPrevPage(),
        } : undefined}
        emptyMessage="No audit entries match the selected filters."
      />
    </div>
  )
}
