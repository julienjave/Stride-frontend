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

import { apiDownload, apiRequest } from '@/api/client'
import type { LegalDisclosureSummary, MakeLegalDisclosureBody, OwnLegalDisclosure } from './types'

// --- QUERY KEYS --------------------------------------------------------------

// One patient's disclosures (admins): ['legal-disclosures', patientId].
export function legalDisclosuresQueryKey(patientId: number) {
  return ['legal-disclosures', patientId] as const
}

// The signed-in patient's own accounting.
export const OWN_LEGAL_DISCLOSURES_QUERY_KEY = ['legal-disclosures', 'own'] as const

// --- THE ADMIN'S SIDE --------------------------------------------------------

// Every disclosure of this patient's record, NEWEST FIRST, the order's
// details included.
export function listLegalDisclosures(patientId: number) {
  return apiRequest<LegalDisclosureSummary[]>(`/users/${patientId}/legal-disclosures`)
}

// Records a disclosure AND downloads its one copy: the answer IS the PDF
// (apiDownload reads it as a file, and the name the server gave it, which
// carries the disclosure's number). A POST: something is created every time.
export function makeLegalDisclosure(patientId: number, body: MakeLegalDisclosureBody) {
  return apiDownload(`/users/${patientId}/legal-disclosures`, { method: 'POST', body })
}

// --- THE PATIENT'S SIDE ------------------------------------------------------

// The times the signed-in patient's record was shared outside the clinic,
// newest first. A disclosure still held back isn't in it — the server
// decides, down to the database.
export function listOwnLegalDisclosures() {
  return apiRequest<OwnLegalDisclosure[]>('/legal-disclosures')
}
