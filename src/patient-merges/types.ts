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

import type { PersonRef } from '@/invitations/types'

// One merge, as GET /patient-merges lists it (admins — decisions §27): the
// account merged AWAY (`mergedId`, deactivated for good), the account that
// kept everything (`survivorId`), when and by whom. An instant (ISO).
export interface PatientMerge {
  id: number
  mergedId: number
  survivorId: number
  mergedAt: string
  mergedBy: PersonRef
}

// What POST /users/:id/merge answers: which merge, which two accounts —
// never what moved (those ids are clinical, and withheld from admins).
export interface PatientMergeAnswer {
  mergeId: number
  mergedId: number
  survivorId: number
}
