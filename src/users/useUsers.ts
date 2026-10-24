import { skipToken, useQuery } from '@tanstack/react-query'
import {
  fetchUsers,
  fetchUsersNeedingAttention,
  usersListQueryKey,
  usersNeedingAttentionQueryKey,
} from './api'
import type { AttentionKind } from './attention'

// Same thin-wrapper shape as useClinics — a plain useQuery is the right
// amount of machinery here (no shared-observer stampede to guard against,
// unlike useCurrentUser's bootstrap-once needs).
//
// includeInactive is part of the query key, not just an argument passed
// to the fetch function — without that, toggling "show deactivated users"
// would read whatever the OTHER mode last cached, since TanStack Query
// treats two calls with the same key as the same cache entry regardless
// of what arguments actually produced it.
// `enabled` (default true): the users list switches it off while a "needs
// attention" filter is shown, so the whole list isn't fetched for nothing.
export function useUsers(includeInactive = false, enabled = true) {
  return useQuery({
    queryKey: usersListQueryKey(includeInactive),
    queryFn: () => fetchUsers(includeInactive),
    enabled,
  })
}

// One "needs attention" group; nothing is asked while `kind` is null (the
// list shows every user then).
//
// `skipToken` (TanStack Query v5) instead of `enabled: kind !== null`: given
// as the queryFn, it disables the query — and the ternary lets TypeScript
// see that `kind` is NOT null in the other branch, so no `kind!` assertion
// (a promise to the compiler it can't check) is needed.
export function useUsersNeedingAttention(kind: AttentionKind | null) {
  return useQuery({
    queryKey: usersNeedingAttentionQueryKey(kind),
    queryFn: kind === null ? skipToken : () => fetchUsersNeedingAttention(kind),
  })
}