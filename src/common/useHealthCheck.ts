import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/api/client'

interface HealthResponse {
  status: string
  info?: Record<string, unknown>
  error?: Record<string, unknown>
  details?: Record<string, unknown>
}

// useQuery is TanStack Query's core hook — give it a unique key
// (queryKey) identifying WHAT is being fetched, and a function
// (queryFn) describing HOW. In return, it hands back not just the
// data, but the full lifecycle: isLoading (first fetch in flight),
// isError (it failed), and the data itself once resolved — all
// managed and cached for you, no useState/useEffect needed by hand.
export function useHealthCheck() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => apiRequest<HealthResponse>('/health'),
  })
}