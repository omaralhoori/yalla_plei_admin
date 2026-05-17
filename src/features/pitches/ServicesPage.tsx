import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Pencil, Trash2,
  Car, Droplets, Wifi, Utensils, CircleDot,
  Shirt, Store, HeartPulse, Users, Coffee,
  Dumbbell, ShieldCheck, Wind, Zap, Droplet, Medal,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import DataTable, { type Column } from '@/components/shared/DataTable'
import PageHeader from '@/components/shared/PageHeader'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'
import type { ApiResponse, Service, ServicePayload } from '@/types/api'

// ─── Flutter Material Icon catalogue ─────────────────────────────────────────
// Each entry maps the Flutter/Material icon string (sent to the API) to a
// Lucide React icon used as a visual preview in the dashboard.

interface IconEntry {
  code: string
  label: string
  Icon: LucideIcon
}

const MATERIAL_ICONS: IconEntry[] = [
  { code: 'local_parking',     label: 'Parking',          Icon: Car         },
  { code: 'shower',            label: 'Showers',          Icon: Droplets    },
  { code: 'wifi',              label: 'WiFi',             Icon: Wifi        },
  { code: 'restaurant',        label: 'Restaurant',       Icon: Utensils    },
  { code: 'sports_soccer',     label: 'Sports / Soccer',  Icon: CircleDot   },
  { code: 'checkroom',         label: 'Changing Rooms',   Icon: Shirt       },
  { code: 'storefront',        label: 'Storefront',       Icon: Store       },
  { code: 'medical_services',  label: 'Medical Services', Icon: HeartPulse  },
  { code: 'wc',                label: 'Restrooms',        Icon: Users       },
  { code: 'local_cafe',        label: 'Café',             Icon: Coffee      },
  { code: 'fitness_center',    label: 'Fitness / Gym',    Icon: Dumbbell    },
  { code: 'security',          label: 'Security',         Icon: ShieldCheck },
  { code: 'ac_unit',           label: 'Air Conditioning', Icon: Wind        },
  { code: 'power',             label: 'Power Outlets',    Icon: Zap         },
  { code: 'water',             label: 'Water',            Icon: Droplet     },
  { code: 'sports',            label: 'Sports',           Icon: Medal       },
]

function iconEntry(code: string): IconEntry | undefined {
  return MATERIAL_ICONS.find(i => i.code === code)
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const serviceSchema = z.object({
  name_en: z.string().min(1, 'English name is required'),
  name_ar: z.string().min(1, 'Arabic name is required'),
  icon_code: z.string().min(1, 'Icon is required'),
})

type ServiceFormValues = z.infer<typeof serviceSchema>

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ServicesPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Service | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null)

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Service[]>>('/admin/services')
      return res.data.data
    },
  })

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { name_en: '', name_ar: '', icon_code: '' },
  })

  const createMutation = useMutation({
    mutationFn: (payload: ServicePayload) => api.post('/admin/services', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] })
      toast({ title: 'Service created', variant: 'success' as never })
      setSheetOpen(false)
    },
    onError: () => toast({ title: 'Failed to create service', variant: 'destructive' }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ServicePayload }) =>
      api.put(`/admin/services/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] })
      toast({ title: 'Service updated', variant: 'success' as never })
      setSheetOpen(false)
    },
    onError: () => toast({ title: 'Failed to update service', variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/services/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] })
      toast({ title: 'Service deleted', variant: 'success' as never })
      setDeleteTarget(null)
    },
    onError: () => toast({ title: 'Failed to delete service', variant: 'destructive' }),
  })

  function openCreate() {
    setEditTarget(null)
    form.reset({ name_en: '', name_ar: '', icon_code: '' })
    setSheetOpen(true)
  }

  function openEdit(s: Service) {
    setEditTarget(s)
    form.reset({ name_en: s.name_en, name_ar: s.name_ar, icon_code: s.icon_code })
    setSheetOpen(true)
  }

  function onSubmit(v: ServiceFormValues) {
    if (editTarget) updateMutation.mutate({ id: editTarget.id, payload: v })
    else createMutation.mutate(v)
  }

  const isBusy = createMutation.isPending || updateMutation.isPending

  // ─── Table ────────────────────────────────────────────────────────────────

  const columns: Column<Service>[] = [
    {
      key: 'icon',
      header: 'Icon',
      cell: row => {
        const entry = iconEntry(row.icon_code)
        return entry
          ? <entry.Icon className="w-5 h-5 text-muted-foreground" />
          : <span className="text-xs text-muted-foreground">—</span>
      },
    },
    { key: 'name_en', header: 'Name (EN)', cell: row => <span className="font-medium">{row.name_en}</span> },
    { key: 'name_ar', header: 'Name (AR)', cell: row => <span dir="rtl">{row.name_ar}</span> },
    {
      key: 'icon_code',
      header: 'Icon Code',
      cell: row => (
        <div className="flex items-center gap-2">
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.icon_code}</code>
          {!iconEntry(row.icon_code) && (
            <span className="text-xs text-amber-600">(custom)</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: row => (
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => setDeleteTarget(row)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Services"
        subtitle="Manage amenities available at pitches"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Service</Button>}
      />

      <DataTable columns={columns} data={services} isLoading={isLoading} />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editTarget ? 'Edit Service' : 'Add Service'}</SheetTitle>
          </SheetHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">

              <FormField control={form.control} name="name_en" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name (English)</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="name_ar" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name (Arabic)</FormLabel>
                  <FormControl><Input dir="rtl" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* ── Icon picker ─────────────────────────────────────────── */}
              <FormField control={form.control} name="icon_code" render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a Material icon…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-72">
                      {MATERIAL_ICONS.map(({ code, label, Icon }) => (
                        <SelectItem key={code} value={code}>
                          <div className="flex items-center gap-2.5">
                            <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
                            <span>{label}</span>
                            <span className="text-xs text-muted-foreground ml-1 font-mono">({code})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
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
        title="Delete Service"
        description={`Delete "${deleteTarget?.name_en}"?`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
