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

import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { sortByName } from '@/patients/roster'
import { fetchMyCareTeam, myCareTeamQueryKey } from '@/team/api'
import { splitTeam } from '@/team/teamRules'
import type { MyCareTeamEntry } from '@/team/types'
import { fetchUsers, usersListQueryKey } from '@/users/api'
import type { User } from '@/users/types'
import type { MessagingRole } from './messagesPath'

// Who I can start a conversation with: someone on a CURRENT care-team link
// with me — the backend's rule for starting one (403 otherwise). Read from
// lists that already exist, under their existing cache keys:
//   - a practitioner: "My patients" (GET /users — for a practitioner, the
//     patients whose care team they're on);
//   - a patient: their care team (current members only, splitTeam).
// One shape for both, so New message draws one list.
export interface Recipient {
  id: number
  firstName: string
  lastName: string
  avatarUrl: string | null
  // A practitioner's specialties (a patient picking among several sees
  // "Knee rehabilitation"); empty for patients. Also searched by the filter
  // (filterCandidates, shared with "Add a colleague").
  specialties: string[]
}

export function recipientsFromPatients(patients: readonly User[]): Recipient[] {
  return sortByName(patients).map((patient) => ({
    id: patient.id,
    firstName: patient.firstName,
    lastName: patient.lastName,
    avatarUrl: patient.avatarUrl,
    specialties: [],
  }))
}

export function recipientsFromTeam(entries: readonly MyCareTeamEntry[]): Recipient[] {
  return splitTeam(entries).current.map(({ practitioner }) => ({
    id: practitioner.id,
    firstName: practitioner.firstName,
    lastName: practitioner.lastName,
    avatarUrl: practitioner.avatarUrl,
    specialties: practitioner.specialties,
  }))
}

// Both queries are always DECLARED (the rules of hooks: the same hooks in the
// same order on every render) and at most one RUNS — `enabled` picks it, and
// nothing runs while the dialog is closed. A patient asking GET /users would
// get a 403; a practitioner has no care team of their own.
export function useRecipients(role: MessagingRole, enabled: boolean) {
  const { data: me } = useCurrentUser()
  const myId = me?.id ?? 0
  const patients = useQuery({
    queryKey: usersListQueryKey(false),
    queryFn: () => fetchUsers(false),
    enabled: enabled && role === 'practitioner',
  })
  const team = useQuery({
    queryKey: myCareTeamQueryKey(myId),
    queryFn: () => fetchMyCareTeam(myId),
    enabled: enabled && role === 'patient' && myId !== 0,
  })
  const source = role === 'practitioner' ? patients : team
  const recipients =
    role === 'practitioner'
      ? patients.data && recipientsFromPatients(patients.data)
      : team.data && recipientsFromTeam(team.data)
  // `query`: the request that runs, for the dialog's "Try again" (and its
  // success, for where focus goes afterwards).
  return { recipients, isError: source.isError, query: source }
}