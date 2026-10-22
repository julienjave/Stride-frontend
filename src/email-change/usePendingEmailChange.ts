import { useQuery } from '@tanstack/react-query'
import { fetchPendingEmailChange } from './api'

// The signed-in person's open change of email, or null. Under the
// ['email-change'] prefix, so one invalidation refreshes it after a request,
// a cancel or a confirmation.
export const pendingEmailChangeQueryKey = ['email-change', 'pending'] as const

export function usePendingEmailChange() {
  return useQuery({
    queryKey: pendingEmailChangeQueryKey,
    queryFn: async () => (await fetchPendingEmailChange()).pending,
  })
}