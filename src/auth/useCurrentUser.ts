import { useQuery } from '@tanstack/react-query'
import { fetchCurrentUser } from './api'

// Exported as a constant, not inlined at each call site, specifically
// because we'll need this EXACT same key later to invalidate/update this
// query from login, logout, and switch-role — using a shared constant
// means there's no risk of a typo (['auth','me'] vs ['auth', 'Me']) silently
// creating two different cache entries that never talk to each other.
export const currentUserQueryKey = ['auth', 'me'] as const

// The one hook every component/route-guard uses to know "who's logged in,
// and do we even know yet." No separate Zustand store mirroring this —
// TanStack Query's cache IS the single source of truth here.
export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserQueryKey,
    queryFn: fetchCurrentUser,
    // A 401 here means "definitely, currently not logged in" — not a
    // transient failure worth retrying. Retrying would just delay the app
    // from knowing there's no session (bad UX: a longer blank/loading
    // screen for every logged-out visitor) for zero benefit, and would
    // spam the backend on every page load for no reason.
    retry: false,
    // This is genuinely different from most of the app's queries: nothing
    // about WHO is logged in changes by polling or by time passing on its
    // own — only an explicit action changes it (login, logout, switching
    // role). staleTime: Infinity tells TanStack Query "never consider this
    // stale by itself"; we'll invalidate it manually at exactly those three
    // moments instead, once we build them.
    staleTime: Infinity,
  })
}