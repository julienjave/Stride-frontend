import { useQuery } from '@tanstack/react-query'
import { fetchSession, sessionQueryKey } from './api'

// One session, for its page. Usually already in the cache when the page
// opens: starting writes its answer there (useStartSession). `enabled`
// lets the page skip an address whose id isn't a number.
export function useSession(id: number, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: sessionQueryKey(id),
    queryFn: () => fetchSession(id),
    enabled,
  })
}