import { useMutation, useQueryClient } from '@tanstack/react-query'
import { userQueryKey } from '@/users/api'
import { endCareTeamMembership } from './api'

// "Leave care team": end MY link to this patient. Afterwards I have no
// clinical access, so every cached piece of this patient's clinical data
// must go, and every list that included them must refresh:
//   - removeQueries for the patient's profile and programs — not
//     invalidate: invalidating would REFETCH them and get a 403 back.
//     Removing simply forgets them, so coming back later starts clean
//     instead of flashing the old profile before the refusal.
//   - invalidate ['users-list'] (my roster no longer has them),
//     ['directory-patients'] (their row is "Add to my patients" again) and
//     ['care-team', patientId] (the team changed).
//
// What keeps the page from refetching the profile on its way out (and
// getting a 403 — a flash of "You're not on this patient's care team"
// before the redirect) is that `onLeft` makes the page SWITCH ITS PROFILE
// QUERY OFF (useUser's `enabled`) before it renders again. `onLeft` is
// called first because that reads naturally; the order itself doesn't
// matter — the state updates and the cache removal all happen before
// React's next render (a mutation check confirmed both orders behave the
// same; removing the switch-off is what the tests catch).
//
// A hook-level callback, like useJoinCareTeam's: it runs even though the
// page unmounts.
export function useLeaveCareTeam(patientId: number, myId: number, onLeft: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => endCareTeamMembership(patientId, myId),
    onSuccess: () => {
      onLeft()
      queryClient.removeQueries({ queryKey: userQueryKey(patientId) })
      queryClient.removeQueries({
        queryKey: ['assigned-programs-list', 'patient', patientId],
      })
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['users-list'] }),
        queryClient.invalidateQueries({ queryKey: ['directory-patients'] }),
        queryClient.invalidateQueries({ queryKey: ['care-team', patientId] }),
      ])
    },
  })
}