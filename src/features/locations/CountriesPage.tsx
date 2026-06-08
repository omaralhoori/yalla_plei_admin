import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Globe, ChevronRight, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import DataTable, { type Column } from '@/components/shared/DataTable'
import PageHeader from '@/components/shared/PageHeader'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'
import type { ApiResponse, Country, CountryPayload, City, CityPayload } from '@/types/api'

// ─── Schemas ──────────────────────────────────────────────────────────────────

const countrySchema = z.object({
  name_en: z.string().min(1, 'English name is required'),
  name_ar: z.string().min(1, 'Arabic name is required'),
  code: z.string().optional(),
  is_enabled: z.boolean(),
})

const citySchema = z.object({
  name_en: z.string().min(1, 'English name is required'),
  name_ar: z.string().min(1, 'Arabic name is required'),
  is_enabled: z.boolean(),
})

type CountryFormValues = z.infer<typeof countrySchema>
type CityFormValues = z.infer<typeof citySchema>

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CountriesPage() {
  const qc = useQueryClient()
  const { toast } = useToast()

  // ── Country state ──────────────────────────────────────────────────────────
  const [countrySheetOpen, setCountrySheetOpen] = useState(false)
  const [editCountry, setEditCountry] = useState<Country | null>(null)
  const [deleteCountry, setDeleteCountry] = useState<Country | null>(null)

  // ── City state ─────────────────────────────────────────────────────────────
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)
  const [citySheetOpen, setCitySheetOpen] = useState(false)
  const [editCity, setEditCity] = useState<City | null>(null)
  const [deleteCity, setDeleteCity] = useState<City | null>(null)

  // ── Forms ──────────────────────────────────────────────────────────────────
  const countryForm = useForm<CountryFormValues>({
    resolver: zodResolver(countrySchema),
    defaultValues: { name_en: '', name_ar: '', code: '', is_enabled: true },
  })

  const cityForm = useForm<CityFormValues>({
    resolver: zodResolver(citySchema),
    defaultValues: { name_en: '', name_ar: '', is_enabled: true },
  })

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: countries = [], isLoading: countriesLoading } = useQuery({
    queryKey: ['countries'],
    queryFn: async () => (await api.get<ApiResponse<Country[]>>('/admin/countries')).data.data,
  })

  const { data: cities = [], isLoading: citiesLoading } = useQuery({
    queryKey: ['cities', selectedCountry?.id],
    queryFn: async () =>
      (await api.get<ApiResponse<City[]>>(`/admin/countries/${selectedCountry!.id}/cities`)).data.data,
    enabled: !!selectedCountry,
  })

  // ── Country mutations ──────────────────────────────────────────────────────
  const createCountryMutation = useMutation({
    mutationFn: (payload: CountryPayload) => api.post('/admin/countries', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['countries'] })
      toast({ title: 'Country created', variant: 'success' as never })
      setCountrySheetOpen(false)
    },
    onError: () => toast({ title: 'Failed to create country', variant: 'destructive' }),
  })

  const updateCountryMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CountryPayload }) =>
      api.put(`/admin/countries/${id}`, payload),
    onSuccess: (_, { id, payload }) => {
      qc.invalidateQueries({ queryKey: ['countries'] })
      toast({ title: 'Country updated', variant: 'success' as never })
      setCountrySheetOpen(false)
      // keep selectedCountry in sync if it was the edited one
      if (selectedCountry?.id === id) {
        setSelectedCountry(prev => prev ? { ...prev, ...payload } : prev)
      }
    },
    onError: () => toast({ title: 'Failed to update country', variant: 'destructive' }),
  })

  const deleteCountryMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/countries/${id}`),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['countries'] })
      toast({ title: 'Country deleted', variant: 'success' as never })
      setDeleteCountry(null)
      if (selectedCountry?.id === id) setSelectedCountry(null)
    },
    onError: () => toast({ title: 'Failed to delete country', variant: 'destructive' }),
  })

  // ── City mutations ─────────────────────────────────────────────────────────
  const createCityMutation = useMutation({
    mutationFn: (payload: CityPayload) => api.post('/admin/cities', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cities', selectedCountry?.id] })
      toast({ title: 'City created', variant: 'success' as never })
      setCitySheetOpen(false)
    },
    onError: () => toast({ title: 'Failed to create city', variant: 'destructive' }),
  })

  const updateCityMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CityPayload> }) =>
      api.put(`/admin/cities/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cities', selectedCountry?.id] })
      toast({ title: 'City updated', variant: 'success' as never })
      setCitySheetOpen(false)
    },
    onError: () => toast({ title: 'Failed to update city', variant: 'destructive' }),
  })

  const deleteCityMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/cities/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cities', selectedCountry?.id] })
      toast({ title: 'City deleted', variant: 'success' as never })
      setDeleteCity(null)
    },
    onError: () => toast({ title: 'Failed to delete city', variant: 'destructive' }),
  })

  // ── Handlers ───────────────────────────────────────────────────────────────
  function openCreateCountry() {
    setEditCountry(null)
    countryForm.reset({ name_en: '', name_ar: '', code: '', is_enabled: true })
    setCountrySheetOpen(true)
  }

  function openEditCountry(c: Country) {
    setEditCountry(c)
    countryForm.reset({ name_en: c.name_en, name_ar: c.name_ar, code: c.code ?? '', is_enabled: c.is_enabled })
    setCountrySheetOpen(true)
  }

  function onCountrySubmit(v: CountryFormValues) {
    const payload: CountryPayload = { ...v, code: v.code || undefined }
    if (editCountry) updateCountryMutation.mutate({ id: editCountry.id, payload })
    else createCountryMutation.mutate(payload)
  }

  function openCreateCity() {
    setEditCity(null)
    cityForm.reset({ name_en: '', name_ar: '', is_enabled: true })
    setCitySheetOpen(true)
  }

  function openEditCity(c: City) {
    setEditCity(c)
    cityForm.reset({ name_en: c.name_en, name_ar: c.name_ar, is_enabled: c.is_enabled })
    setCitySheetOpen(true)
  }

  function onCitySubmit(v: CityFormValues) {
    if (!selectedCountry) return
    if (editCity) {
      updateCityMutation.mutate({ id: editCity.id, payload: v })
    } else {
      createCityMutation.mutate({ country_id: selectedCountry.id, ...v })
    }
  }

  // ── Table columns ──────────────────────────────────────────────────────────
  const countryColumns: Column<Country>[] = [
    {
      key: 'name_en',
      header: 'Country',
      cell: row => (
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="font-medium">{row.name_en}</span>
        </div>
      ),
    },
    { key: 'name_ar', header: 'Name (AR)', cell: row => <span dir="rtl">{row.name_ar}</span> },
    {
      key: 'code',
      header: 'Code',
      cell: row => row.code
        ? <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.code}</code>
        : <span className="text-muted-foreground text-xs">—</span>,
    },
    {
      key: 'is_enabled',
      header: 'Status',
      cell: row => (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          row.is_enabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
        }`}>
          {row.is_enabled ? 'Enabled' : 'Disabled'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: row => (
        <div className="flex gap-2 justify-end">
          <Button
            size="sm"
            variant={selectedCountry?.id === row.id ? 'default' : 'outline'}
            onClick={() => setSelectedCountry(prev => prev?.id === row.id ? null : row)}
            className="gap-1.5"
          >
            <Building2 className="w-3.5 h-3.5" />
            Cities
            <ChevronRight className={`w-3 h-3 transition-transform ${selectedCountry?.id === row.id ? 'rotate-90' : ''}`} />
          </Button>
          <Button size="sm" variant="outline" onClick={() => openEditCountry(row)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => setDeleteCountry(row)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  const cityColumns: Column<City>[] = [
    { key: 'name_en', header: 'City', cell: row => <span className="font-medium">{row.name_en}</span> },
    { key: 'name_ar', header: 'Name (AR)', cell: row => <span dir="rtl">{row.name_ar}</span> },
    {
      key: 'is_enabled',
      header: 'Status',
      cell: row => (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          row.is_enabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
        }`}>
          {row.is_enabled ? 'Enabled' : 'Disabled'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: row => (
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="outline" onClick={() => openEditCity(row)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => setDeleteCity(row)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  const isCountryBusy = createCountryMutation.isPending || updateCountryMutation.isPending
  const isCityBusy = createCityMutation.isPending || updateCityMutation.isPending

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="Countries & Cities"
        subtitle="Manage countries and their cities available for player profiles"
        action={
          <Button onClick={openCreateCountry}>
            <Plus className="w-4 h-4 mr-2" />Add Country
          </Button>
        }
      />

      <DataTable columns={countryColumns} data={countries} isLoading={countriesLoading} />

      {/* Cities panel — shown when a country is selected */}
      {selectedCountry && (
        <div className="border rounded-xl p-5 space-y-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                Cities in {selectedCountry.name_en}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">{selectedCountry.name_ar}</p>
            </div>
            <Button onClick={openCreateCity} size="sm">
              <Plus className="w-4 h-4 mr-1.5" />Add City
            </Button>
          </div>

          <DataTable columns={cityColumns} data={cities} isLoading={citiesLoading} />
        </div>
      )}

      {/* ── Country sheet ────────────────────────────────────────────────────── */}
      <Sheet open={countrySheetOpen} onOpenChange={setCountrySheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editCountry ? 'Edit Country' : 'Add Country'}</SheetTitle>
          </SheetHeader>

          <Form {...countryForm}>
            <form onSubmit={countryForm.handleSubmit(onCountrySubmit)} className="mt-6 space-y-4">
              <FormField control={countryForm.control} name="name_en" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name (English)</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={countryForm.control} name="name_ar" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name (Arabic)</FormLabel>
                  <FormControl><Input dir="rtl" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={countryForm.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel>ISO Code <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl><Input placeholder="e.g. JO" maxLength={10} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={countryForm.control} name="is_enabled" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="cursor-pointer">Enabled</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )} />

              <SheetFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setCountrySheetOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isCountryBusy}>{isCountryBusy ? 'Saving...' : 'Save'}</Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* ── City sheet ───────────────────────────────────────────────────────── */}
      <Sheet open={citySheetOpen} onOpenChange={setCitySheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editCity ? 'Edit City' : `Add City to ${selectedCountry?.name_en}`}
            </SheetTitle>
          </SheetHeader>

          <Form {...cityForm}>
            <form onSubmit={cityForm.handleSubmit(onCitySubmit)} className="mt-6 space-y-4">
              <FormField control={cityForm.control} name="name_en" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name (English)</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={cityForm.control} name="name_ar" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name (Arabic)</FormLabel>
                  <FormControl><Input dir="rtl" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={cityForm.control} name="is_enabled" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="cursor-pointer">Enabled</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )} />

              <SheetFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setCitySheetOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isCityBusy}>{isCityBusy ? 'Saving...' : 'Save'}</Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* ── Confirm dialogs ──────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteCountry}
        title="Delete Country"
        description={`Delete "${deleteCountry?.name_en}" and all its cities?`}
        onConfirm={() => deleteCountry && deleteCountryMutation.mutate(deleteCountry.id)}
        onCancel={() => setDeleteCountry(null)}
        isLoading={deleteCountryMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleteCity}
        title="Delete City"
        description={`Delete "${deleteCity?.name_en}"?`}
        onConfirm={() => deleteCity && deleteCityMutation.mutate(deleteCity.id)}
        onCancel={() => setDeleteCity(null)}
        isLoading={deleteCityMutation.isPending}
      />
    </div>
  )
}
