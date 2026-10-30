import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateUser, userQueryKey } from '@/users/api'
import { fetchCurrentUser } from './api'
import type { CurrentUser } from './types'
import { currentUserQueryKey } from './useCurrentUser'

// Turns the new-message emails on or off (roadmap Phase 6.5) — from the
// Settings menu, where a pick closes the menu at once. So, like the weight
// unit: OPTIMISTIC — the tick moves the moment it's clicked, the request
// follows.
//
// Simpler than useSetPreferredWeightUnit on one point, on purpose: on a
// failure it doesn't work out which value the server holds — it ASKS
// (/auth/me refetched). With one on/off value and a failure that can only be
// technical, a request for the truth is shorter and can't be wrong; the
// weight unit's bookkeeping exists for quick bursts of picks between two
// units, which a single switch doesn't need. `scope` still sends the
// clicks one at a time, in order, so the server ends with the last one.
export function useSetMessageEmailNotices() {
  const queryClient = useQueryClient()

  function setCached(on: boolean) {
    queryClient.setQueryData<CurrentUser | null>(currentUserQueryKey, (current) =>
      current ? { ...current, messageEmailNotices: on } : current,
    )
  }

  return useMutation({
    mutationFn: ({ userId, on }: { userId: number; on: boolean }) =>
      updateUser(userId, { messageEmailNotices: on }),
    scope: { id: 'message-email-notices' },
    onMutate: async ({ on }) => {
      // An /auth/me answer in flight could land after this and undo it.
      await queryClient.cancelQueries({ queryKey: currentUserQueryKey })
      setCached(on)
    },
    // The PATCH answers with the whole user: the profile page's own entry
    // is refreshed with it, as the weight unit does.
    onSuccess: (updated, { userId }) => {
      queryClient.setQueryData(userQueryKey(userId), updated)
    },
    // The truth, fetched EXPLICITLY: invalidating wouldn't do it —
    // useCurrentUser's query is `enabled: false` on purpose (its comment
    // tells the infinite-refetch bug that prevents), so nothing refetches it
    // on its own. prefetchQuery with staleTime 0 always asks, and writes the
    // answer into the same cache entry every observer reads.
    onError: () =>
      void queryClient.prefetchQuery({
        queryKey: currentUserQueryKey,
        queryFn: fetchCurrentUser,
        staleTime: 0,
      }),
  })
}