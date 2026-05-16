import { type ReactNode } from 'react'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  cell: (row: T) => ReactNode
  csvValue?: (row: T) => string | number | undefined
  className?: string
}

interface PaginationProps {
  total: number
  limit: number
  offset: number
  onChange: (offset: number) => void
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  pagination?: PaginationProps
  emptyMessage?: string
  csvFilename?: string
}

function exportCsv<T>(columns: Column<T>[], data: T[], filename: string) {
  const csvColumns = columns.filter(c => c.csvValue)
  const header = csvColumns.map(c => `"${c.header}"`).join(',')
  const rows = data.map(row =>
    csvColumns.map(c => {
      const val = c.csvValue!(row) ?? ''
      return `"${String(val).replace(/"/g, '""')}"`
    }).join(',')
  )
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function DataTable<T>({
  columns,
  data,
  isLoading = false,
  pagination,
  emptyMessage = 'No records found.',
  csvFilename,
}: DataTableProps<T>) {
  const currentPage = pagination ? Math.floor(pagination.offset / pagination.limit) + 1 : 1
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1
  const hasPrev = pagination ? pagination.offset > 0 : false
  const hasNext = pagination ? pagination.offset + pagination.limit < pagination.total : false

  const hasCsvColumns = columns.some(c => c.csvValue)

  return (
    <div className="space-y-4">
      {csvFilename && hasCsvColumns && data.length > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => exportCsv(columns, data, csvFilename)}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      )}

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {columns.map(col => (
                <TableHead key={col.key} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map(col => (
                    <TableCell key={col.key}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-12 text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, i) => (
                <TableRow key={i}>
                  {columns.map(col => (
                    <TableCell key={col.key} className={col.className}>
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.total > pagination.limit && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {currentPage} of {totalPages} &mdash; {pagination.total} total records
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPrev || isLoading}
              onClick={() => pagination.onChange(pagination.offset - pagination.limit)}
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNext || isLoading}
              onClick={() => pagination.onChange(pagination.offset + pagination.limit)}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
