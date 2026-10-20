import { useQuery } from '@tanstack/react-query'
import { alertsQueryKey, fetchAlerts } from './api'

// The "For review" list. The home's card slot and its section both call this with
// the same `today`, so they share ONE cache entry — one request for both.
export function useAlerts(today: string) {
  return useQuery({
    queryKey: alertsQueryKey(today),
    queryFn: () => fetchAlerts(today),
  })
}