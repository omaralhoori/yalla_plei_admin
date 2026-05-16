import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { format, subDays } from 'date-fns'
import { TrendingUp, Users, Calendar, MapPin } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import type { ApiResponse, ReportSummary } from '@/types/api'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']

export default function DashboardPage() {
  const [from, setFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [appliedFrom, setAppliedFrom] = useState(from)
  const [appliedTo, setAppliedTo] = useState(to)

  const { data, isLoading } = useQuery({
    queryKey: ['reports-summary', appliedFrom, appliedTo],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ReportSummary>>(
        `/admin/reports/summary?from=${appliedFrom}&to=${appliedTo}`
      )
      return res.data.data
    },
  })

  const summary = data?.summary

  const chartData = summary
    ? [
        { name: 'Revenue (JOD)', value: summary.total_revenue, fill: COLORS[0] },
        { name: 'Bookings', value: summary.total_bookings, fill: COLORS[1] },
        { name: 'New Users', value: summary.new_users, fill: COLORS[2] },
      ]
    : []

  const barData = summary
    ? [
        { label: 'Revenue', value: summary.total_revenue },
        { label: 'Bookings', value: summary.total_bookings },
        { label: 'New Users', value: summary.new_users },
        { label: 'Top Pitch Bookings', value: summary.most_popular_pitch_bookings },
      ]
    : []

  const pieData = summary
    ? [
        { name: 'Bookings', value: summary.total_bookings },
        { name: 'New Users', value: summary.new_users },
        { name: 'Top Pitch Bookings', value: summary.most_popular_pitch_bookings },
      ]
    : []

  function handleApply() {
    setAppliedFrom(from)
    setAppliedTo(to)
  }

  return (
    <div className="space-y-6">
      {/* Date Range Picker */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label htmlFor="from">From</Label>
              <Input id="from" type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="to">To</Label>
              <Input id="to" type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" />
            </div>
            <Button onClick={handleApply}>Apply Range</Button>
            <Button variant="outline" onClick={() => {
              const f = format(subDays(new Date(), 30), 'yyyy-MM-dd')
              const t = format(new Date(), 'yyyy-MM-dd')
              setFrom(f); setTo(t); setAppliedFrom(f); setAppliedTo(t)
            }}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Total Revenue"
          value={isLoading ? null : formatCurrency(summary?.total_revenue ?? 0)}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <StatCard
          icon={Calendar}
          label="Total Bookings"
          value={isLoading ? null : String(summary?.total_bookings ?? 0)}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <StatCard
          icon={Users}
          label="New Users"
          value={isLoading ? null : String(summary?.new_users ?? 0)}
          color="text-amber-600"
          bg="bg-amber-50"
        />
        <StatCard
          icon={MapPin}
          label="Top Pitch"
          value={isLoading ? null : summary?.most_popular_pitch_name ?? '—'}
          subValue={isLoading ? null : summary ? `${summary.most_popular_pitch_bookings} bookings` : ''}
          color="text-purple-600"
          bg="bg-purple-50"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area Chart – Revenue */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Revenue Overview</CardTitle>
            <CardDescription>{appliedFrom} → {appliedTo}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={[{ period: appliedFrom, revenue: summary?.total_revenue ?? 0 }]}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [formatCurrency(Number(v)), 'Revenue']} />
                  <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#colorRevenue)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Bar Chart – Metrics */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Key Metrics</CardTitle>
            <CardDescription>Bookings, Users & Pitch Activity</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {barData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart – Distribution */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Activity Distribution</CardTitle>
            <CardDescription>Bookings vs Users vs Top Pitch</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Table */}
      {!isLoading && chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Period Summary</CardTitle>
            <CardDescription>
              {appliedFrom} to {appliedTo}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {chartData.map(item => (
                <div key={item.name} className="p-4 rounded-lg border bg-slate-50 text-center">
                  <div className="text-2xl font-bold" style={{ color: item.fill }}>
                    {item.name === 'Revenue (JOD)' ? formatCurrency(item.value) : item.value}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{item.name}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: string | null
  subValue?: string | null
  color: string
  bg: string
}

function StatCard({ icon: Icon, label, value, subValue, color, bg }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            {value === null ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p className="text-2xl font-bold truncate max-w-[160px]">{value}</p>
            )}
            {subValue !== undefined && (
              <p className="text-xs text-muted-foreground">{subValue ?? ''}</p>
            )}
          </div>
          <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
