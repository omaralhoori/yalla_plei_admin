import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Eye, Search, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import DataTable, { type Column } from '@/components/shared/DataTable'
import PageHeader from '@/components/shared/PageHeader'
import { useToast } from '@/hooks/use-toast'
import { usePagination } from '@/hooks/usePagination'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { ApiResponse, PaginatedResponse, AdminUser, CreateAdminUserPayload } from '@/types/api'

const createUserSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(7, 'Valid phone number is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['player', 'manager', 'admin']),
  gender: z.enum(['male', 'female']),
})

type CreateUserFormValues = z.infer<typeof createUserSchema>

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-blue-100 text-blue-700',
  player: 'bg-slate-100 text-slate-600',
}

export default function UsersPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const navigate = useNavigate()
  const { offset, limit, goToNextPage, goToPrevPage, reset } = usePagination(20)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [applied, setApplied] = useState({ search: '', role: '' })
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['users', offset, limit, applied],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (applied.search) params.set('search', applied.search)
      if (applied.role) params.set('role', applied.role)
      const res = await api.get<ApiResponse<PaginatedResponse<AdminUser>>>(`/admin/users?${params}`)
      return res.data.data
    },
  })

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { first_name: '', last_name: '', email: '', phone: '', password: '', role: 'manager', gender: 'male' },
  })

  const createMutation = useMutation({
    mutationFn: (payload: CreateAdminUserPayload) => api.post('/admin/users', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast({ title: 'User created successfully', variant: 'success' as never })
      setCreateOpen(false)
      form.reset()
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      const msg = axiosErr?.response?.data?.error ?? 'Failed to create user'
      toast({ title: msg, variant: 'destructive' })
    },
  })

  function applyFilters() {
    reset()
    setApplied({ search, role: roleFilter })
  }

  function onSubmit(values: CreateUserFormValues) {
    createMutation.mutate(values)
  }

  const columns: Column<AdminUser>[] = [
    {
      key: 'user',
      header: 'User',
      cell: row => (
        <div>
          <div className="font-medium text-sm">{row.first_name} {row.last_name}</div>
          <div className="text-xs text-muted-foreground">{row.email}</div>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', cell: row => <span className="text-sm">{row.phone}</span> },
    {
      key: 'role',
      header: 'Role',
      cell: row => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${ROLE_BADGE[row.role] ?? 'bg-slate-100 text-slate-600'}`}>
          {row.role}
        </span>
      ),
    },
    {
      key: 'gender',
      header: 'Gender',
      cell: row => <span className="capitalize text-sm text-muted-foreground">{row.gender}</span>,
    },
    {
      key: 'verified',
      header: 'Verified',
      cell: row => (
        <div className="flex gap-1 flex-wrap">
          {row.is_email_verified && (
            <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200">Email</Badge>
          )}
          {row.is_phone_verified && (
            <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200">Phone</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'joined',
      header: 'Joined',
      cell: row => <span className="text-xs text-muted-foreground">{formatDate(row.created_at)}</span>,
    },
    {
      key: 'actions',
      header: '',
      cell: row => (
        <Button size="sm" variant="outline" onClick={() => navigate(`/users/${row.id}`)}>
          <Eye className="w-3.5 h-3.5 mr-1" />View
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="View, search, and manage platform users"
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />Create Admin User
          </Button>
        }
      />

      <div className="bg-white border rounded-lg p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="space-y-1 flex-1 min-w-[200px]">
          <Label>Search</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Name, email or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
              className="pl-8"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Role</Label>
          <Select value={roleFilter} onValueChange={v => setRoleFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-36"><SelectValue placeholder="All roles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="player">Player</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
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
        emptyMessage="No users found for the selected filters."
      />

      <Dialog open={createOpen} onOpenChange={open => { setCreateOpen(open); if (!open) form.reset() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Admin User</DialogTitle>
            <DialogDescription>
              Manually create a manager or admin account, bypassing the standard registration flow.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="first_name" render={({ field }) => (
                  <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="last_name" render={({ field }) => (
                  <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input placeholder="+962..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="player">Player</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="gender" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create User'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
