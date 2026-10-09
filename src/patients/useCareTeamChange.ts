import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addCareTeamMember, endCareTeamMembership } from './api'
import type { AddCareTeamMemberInput } from './types'

// Adding someone to, or ending someone's place on, a patient's care team —
// for the people who STAY on the page afterwards (a practitioner adding a
// colleague; an admin adding or ending anyone). Leaving the team yourself
// is different — your access goes — and has its own hook,
// useLeaveCareTeam.
//
// Both refresh ['care-team', patientId]: a prefix that covers the current
// team, the history AND the candidates (whose "on the team" flags just
// changed) — see careTeamCandidatesQueryKey. Awaited, so the button stays
// busy until the list shows the change; `onDone` then closes the dialog.
// A hook-level callback, as in useJoinCareTeam.

export function useAddCareTeamMember(patientId: number, onDone: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AddCareTeamMemberInput) => addCareTeamMember(patientId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['care-team', patientId] })
      onDone()
    },
  })
}

export function useEndCareTeamMembership(
  patientId: number,
  practitionerId: number,
  onDone: () => void,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => endCareTeamMembership(patientId, practitionerId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['care-team', patientId] })
      onDone()
    },
  })
}