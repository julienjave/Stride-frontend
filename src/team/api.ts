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

import { apiRequest } from '@/api/client'
import { careTeamQueryKey } from '@/patients/api'
import type { MyCareTeamEntry } from './types'

// The patient's own care team, WITH its history (?includeEnded=true): the
// Team page shows the current members and, behind a switch, the past ones —
// one request for both. The key is the practitioner side's own
// (['care-team', patientId, true]) because it IS the same resource at the
// same URL: one cache entry per answer, and invalidating ['care-team', id]
// (what every care-team change does) refreshes this one too.
export function myCareTeamQueryKey(patientId: number) {
  return careTeamQueryKey(patientId, true)
}

export function fetchMyCareTeam(patientId: number) {
  return apiRequest<MyCareTeamEntry[]>(`/users/${patientId}/care-team?includeEnded=true`)
}