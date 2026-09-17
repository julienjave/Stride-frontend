import { useQuery } from '@tanstack/react-query'
import { fetchUsers, usersListQueryKey } from './api'

// Same thin-wrapper shape as useClinics — a plain useQuery is the right
// amount of machinery here (no shared-observer stampede to guard against,
// unlike useCurrentUser's bootstrap-once needs).
//
// includeInactive is part of the query key, not just an argument passed
// to the fetch function — without that, toggling "show deactivated users"
// would read whatever the OTHER mode last cached, since TanStack Query
// treats two calls with the same key as the same cache entry regardless
// of what arguments actually produced it.
export function useUsers(includeInactive = false) {
  return useQuery({
    queryKey: usersListQueryKey(includeInactive),
    queryFn: () => fetchUsers(includeInactive),
  })
}