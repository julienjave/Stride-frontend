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
import type { PatientMerge, PatientMergeAnswer } from './types'

// One list for the whole app: a clinic merges rarely, and both screens that
// need merges (the users list's badge, a user page's banner) read it whole.
export const patientMergesQueryKey = ['patient-merges'] as const

export function fetchPatientMerges() {
  return apiRequest<PatientMerge[]>('/patient-merges')
}

// Merges `mergedId` INTO `intoUserId` (the account the admin keeps), after
// the admin's own step-up: their password, and their code when their account
// has two-factor on. The code key is left out when there's no code — the
// backend's DTO refuses an empty one.
export function mergePatients(
  mergedId: number,
  intoUserId: number,
  currentPassword: string,
  mfaCode?: string,
) {
  return apiRequest<PatientMergeAnswer>(`/users/${mergedId}/merge`, {
    method: 'POST',
    body:
      mfaCode === undefined
        ? { intoUserId, currentPassword }
        : { intoUserId, currentPassword, mfaCode },
  })
}
