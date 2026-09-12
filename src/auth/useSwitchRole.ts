import { useMutation, useQueryClient } from '@tanstack/react-query'
import { switchRole } from './api'
import { currentUserQueryKey } from './useCurrentUser'

// This is a hazard: "a user who
// switches from practitioner to admin will briefly see stale, wrongly-
// scoped cached data" unless every role-scoped query gets invalidated at
// the moment of switching — not just the current-user record itself.
export function useSwitchRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: switchRole,
    onSuccess: (user) => {
      // ORDER MATTERS here, and it's the opposite of an intuitive
      // "update, then clean up" sequence:
      //
      // 1. clear() FIRST — wipes every cached query, including the current
      //    one for currentUserQueryKey. This guarantees zero window where
      //    some OTHER role-scoped query (a patient roster, an exercise
      //    library filtered to the old role's permissions) could still be
      //    read from cache after the switch has happened.
      // 2. setQueryData SECOND — immediately re-seeds JUST the current-user
      //    entry with the fresh object this response already gave us. This
      //    avoids two problems at once: no refetch is needed (we already
      //    have the data), AND no other component reading useCurrentUser()
      //    ever sees an undefined/loading gap between steps 1 and 2 for
      //    the one piece of data every guard/header depends on.
      queryClient.clear()
      queryClient.setQueryData(currentUserQueryKey, user)
    },
  })
}