/*
    Copyright 2026 Julien Javelaud

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
// -----------------------------------------------------------------------------------------------------------

import { useQuery, useQueryClient } from '@tanstack/react-query'
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
  const queryClient = useQueryClient()

  // The real fix for a confirmed, reproduced infinite-loop bug: TanStack
  // Query, for a query with NO successful data (only an error), triggers
  // a fresh fetch attempt the moment ANY new observer mounts — completely
  // independent of retry/refetchOnMount, which only govern refetching of
  // EXISTING successful data. With several components (App, RequireAuth,
  // RequireGuest, ...) each independently calling useCurrentUser(), every
  // mount/unmount cycle was re-arming a fresh fetch, resetting the shared
  // query back to 'pending', which re-triggered App's own isLoading gate
  // to unmount the whole router — an unbounded loop (reproduced: 1000+
  // fetches in 2 seconds).
  //
  // The fix: exactly ONE fetch is ever imperatively kicked off — checked
  // against the query cache's OWN state (getQueryState), safe to call on
  // every render since it's a pure, synchronous read with no side effect
  // of its own. The moment the first prefetchQuery call below runs,
  // TanStack Query synchronously creates the Query object in the cache
  // (before the fetch itself resolves) — so any OTHER component rendering
  // in that same tick sees a defined state immediately and skips
  // re-triggering. No ref needed: an earlier version of this used
  // useRef(), but mutating a ref's .current during render is itself a
  // real anti-pattern (caught by eslint-plugin-react-hooks's refs rule) —
  // refs should only be touched in effects/event handlers, not render.
  if (queryClient.getQueryState(currentUserQueryKey) === undefined) {
    // prefetchQuery (not fetchQuery) deliberately: it internally
    // swallows the rejection so we don't need our own try/catch here,
    // while still correctly writing the real error into the query
    // cache for every observer below to read reactively.
    void queryClient.prefetchQuery({
      queryKey: currentUserQueryKey,
      queryFn: fetchCurrentUser,
    })
  }

  return useQuery({
    queryKey: currentUserQueryKey,
    queryFn: fetchCurrentUser,
    // THE other half of the fix: this observer (whichever component it
    // belongs to) will NEVER trigger its own fetch, no matter how many
    // times it mounts or unmounts. It only ever reactively reflects
    // whatever the bootstrap fetch above (or a later login/logout/
    // switch-role mutation via setQueryData/clear) has written into the
    // shared cache.
    enabled: false,
    retry: false,
    staleTime: Infinity,
  })
}