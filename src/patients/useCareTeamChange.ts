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

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addCareTeamMember, endCareTeamMembership } from './api'
import type { AddCareTeamMemberInput } from './types'
import { refreshAttention } from '@/users/attention'

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
//
// Both also call refreshAttention (decisions §17): a link added or ended can
// move the patient into or out of the admin home's "Patients without a care
// team" — the home's numbers and the filtered users list are marked stale.

export function useAddCareTeamMember(patientId: number, onDone: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AddCareTeamMemberInput) => addCareTeamMember(patientId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['care-team', patientId] }),
        refreshAttention(queryClient),
      ])
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['care-team', patientId] }),
        refreshAttention(queryClient),
      ])
      onDone()
    },
  })
}