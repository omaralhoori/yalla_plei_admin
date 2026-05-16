import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn, formatDate } from '@/lib/utils'
import { api } from '@/lib/api'
import type { ApiResponse, PaginatedResponse, Match } from '@/types/api'

interface Props {
  value: string
  onChange: (matchId: string) => void
  disabled?: boolean
  placeholder?: string
}

export function MatchCombobox({ value, onChange, disabled, placeholder = 'Search for a match…' }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const { data: matches = [] } = useQuery({
    queryKey: ['matches-combobox'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<PaginatedResponse<Match>>>('/admin/matches?limit=200')
      return res.data.data.items ?? []
    },
    staleTime: 30_000,
  })

  const filtered = search.trim()
    ? matches.filter(m => {
        const haystack = `${m.pitch?.name_en ?? ''} ${m.date ?? ''} ${m.sport?.name_en ?? ''}`.toLowerCase()
        return haystack.includes(search.toLowerCase())
      })
    : matches.slice(0, 60)

  const selected = matches.find(m => m.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="truncate text-sm">
            {selected
              ? `${selected.pitch?.name_en ?? 'Unknown'} — ${formatDate(selected.date)} (${selected.players_format})`
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="p-0"
        style={{ width: 'var(--radix-popover-trigger-width)' }}
        align="start"
      >
        {/* Search input */}
        <div className="flex items-center border-b px-3 gap-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            placeholder="Search by pitch, date, or sport…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Results */}
        <div className="max-h-64 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No matches found.</p>
          ) : (
            filtered.map(m => (
              <div
                key={m.id}
                role="option"
                aria-selected={m.id === value}
                className={cn(
                  'flex cursor-pointer items-start gap-2 px-3 py-2 text-sm hover:bg-muted',
                  m.id === value && 'bg-muted'
                )}
                onClick={() => { onChange(m.id); setOpen(false); setSearch('') }}
              >
                <Check className={cn('mt-0.5 h-4 w-4 shrink-0', m.id === value ? 'opacity-100 text-primary' : 'opacity-0')} />
                <div>
                  <div className="font-medium">{m.pitch?.name_en ?? '—'}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(m.date)} · {m.players_format}
                    {m.sport?.name_en ? ` · ${m.sport.name_en}` : ''}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
