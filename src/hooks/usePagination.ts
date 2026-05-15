import { useState } from 'react'

interface PaginationState {
  offset: number
  limit: number
}

interface UsePaginationReturn extends PaginationState {
  page: number
  goToNextPage: () => void
  goToPrevPage: () => void
  reset: () => void
  setLimit: (limit: number) => void
}

export function usePagination(initialLimit = 20): UsePaginationReturn {
  const [state, setState] = useState<PaginationState>({ offset: 0, limit: initialLimit })

  return {
    ...state,
    page: Math.floor(state.offset / state.limit) + 1,
    goToNextPage: () => setState(s => ({ ...s, offset: s.offset + s.limit })),
    goToPrevPage: () => setState(s => ({ ...s, offset: Math.max(0, s.offset - s.limit) })),
    reset: () => setState(s => ({ ...s, offset: 0 })),
    setLimit: (limit: number) => setState({ offset: 0, limit }),
  }
}
