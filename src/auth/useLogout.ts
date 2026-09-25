import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { logout } from './api'
import { currentUserQueryKey } from './useCurrentUser'

// A hook (not just a plain function) specifically so it can use
// useMutation and useNavigate — both of these only work inside a React
// component or another hook, since they rely on React's context system
// under the hood.
export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // Nothing cached (patient roster, exercise library, another user's
      // messages) may stay in memory for whoever logs in next on this
      // browser tab — so every query is dropped, EXCEPT one: the current
      // user, which is set to `null`, i.e. "known to be logged out".
      //
      // Why not queryClient.clear(), which this used to call: clear()
      // REMOVES the current-user query too, leaving "unknown" rather than
      // "logged out". Any component still on screen that calls
      // useCurrentUser() — the header, until the navigation below finishes
      // — then re-renders, finds no current-user query at all, and starts
      // the app's bootstrap GET /auth/me again (see useCurrentUser's
      // getQueryState check). Whether that re-render happened before or
      // after the header unmounted depended on timing, which is why
      // UserMenu's logout test failed only sometimes, on a busy machine.
      // A cached `null` is a known answer, so nothing refetches — and
      // every guard (RequireAuth, RequireGuest) reads it as "logged out"
      // straight away.
      //
      // Same technique as useSwitchRole: find the one query to keep, and
      // remove all the others with a predicate.
      const currentUserQuery = queryClient
        .getQueryCache()
        .find({ queryKey: currentUserQueryKey, exact: true })
      queryClient.removeQueries({
        predicate: (query) => query !== currentUserQuery,
      })
      queryClient.setQueryData(currentUserQueryKey, null)
      void navigate('/login')
    },
  })
}