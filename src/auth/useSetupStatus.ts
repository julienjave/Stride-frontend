import { useQuery } from '@tanstack/react-query'
import { fetchSetupStatus } from './api'

// Shared constant for the same reason as currentUserQueryKey: the page that
// completes setup (RegisterClinicPage) writes into this exact cache entry,
// and a typo'd copy of the key would silently create a second one.
export const setupStatusQueryKey = ['auth', 'setup-status'] as const

// Has Stride been set up yet? Read by the sign-in page (to offer "First
// time? Set up Stride" only while it hasn't) and by the setup page itself
// (to show "already set up" instead of a form that would be refused).
//
// staleTime: Infinity — the answer changes exactly once in an install's
// life, from false to true, and the one place that changes it (completing
// setup, or being told by a 403 that someone else already did) writes the
// new answer into the cache itself. Nothing to refetch on a timer. Logging
// out drops every query but the current user (see useLogout), so the next
// sign-in page asks the server again anyway.
//
// A normal useQuery, unlike useCurrentUser's enabled:false arrangement:
// that one guards against a refetch loop caused by route guards mounting
// and unmounting around ITS state. Nothing re-mounts around this query's
// state — it only decides what a page shows.
export function useSetupStatus() {
  return useQuery({
    queryKey: setupStatusQueryKey,
    queryFn: fetchSetupStatus,
    staleTime: Infinity,
  })
}