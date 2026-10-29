import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchUserListPage, fetchUsers, userListPageQueryKey, usersListQueryKey } from './api'

// Same thin-wrapper shape as useClinics — a plain useQuery is the right
// amount of machinery here (no shared-observer stampede to guard against,
// unlike useCurrentUser's bootstrap-once needs).
//
// includeInactive is part of the query key, not just an argument passed
// to the fetch function — without that, toggling "show deactivated users"
// would read whatever the OTHER mode last cached, since TanStack Query
// treats two calls with the same key as the same cache entry regardless
// of what arguments actually produced it.
// `enabled` (default true): the user page asks for the whole list only when
// it has a merged account to describe. (The Users page itself reads pages of
// GET /admin/users since Phase 6.5 — useUserListPage below.)
export function useUsers(includeInactive = false, enabled = true) {
  return useQuery({
    queryKey: usersListQueryKey(includeInactive),
    queryFn: () => fetchUsers(includeInactive),
    enabled,
  })
}

// One page of the Users page (GET /admin/users). `keepPreviousData`, as the
// audit log does: while the next page (or another filter) loads, the
// PREVIOUS rows stay on screen — `isPlaceholderData` says so, and the page
// dims them — instead of the list vanishing into a skeleton on every click
// or keystroke.
export function useUserListPage(query: string) {
  return useQuery({
    queryKey: userListPageQueryKey(query),
    queryFn: () => fetchUserListPage(query),
    placeholderData: keepPreviousData,
  })
}