import { useQuery } from '@tanstack/react-query'
import { fetchProgram, programQueryKey } from './api'

// `enabled` (default true), like useUser: the assign form calls this hook on
// every render — hooks can't be called conditionally — but there's nothing
// to fetch until a template is chosen. With enabled: false the query simply
// waits (no request, `data` undefined) and starts when it turns true.
export function useProgram(id: number, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: programQueryKey(id),
    queryFn: () => fetchProgram(id),
    enabled,
  })
}