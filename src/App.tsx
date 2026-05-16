import './i18n'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { router } from '@/router'
import { queryClient } from '@/lib/queryClient'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider } from '@/contexts/ThemeContext'

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  )
}
