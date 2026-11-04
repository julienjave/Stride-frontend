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
import type { MedicalFileEntry, NewMedicalFileEntry } from './types'

// --- QUERY KEYS --------------------------------------------------------------

// One patient's whole file: ['medical-file', patientId]. The patient's own
// "My records" and the practitioner's page use the same key shape (each
// signed-in role has its own cache: a role switch clears it), so a write
// invalidates one prefix.
export function medicalFileQueryKey(patientId: number) {
  return ['medical-file', patientId] as const
}

// One entry (the amend page) — under the file's prefix, so invalidating the
// file refreshes it too.
export function medicalFileEntryQueryKey(patientId: number, entryId: number) {
  return ['medical-file', patientId, 'entry', entryId] as const
}

// --- QUERIES -----------------------------------------------------------------

// A practitioner names the patient: GET /medical-files?patientId=6. A patient
// asks for their own file with no parameter (the backend takes the id from
// the session). Every call is a READ the backend writes into the audit log
// (MEDICAL_FILE_VIEWED, with the entries shown) — which is why nothing in the
// app asks for the file unless the person opened a page that shows it
// (decisions §8: the patient page's link card loads nothing).
export function fetchMedicalFile(patientId: number | 'mine') {
  return apiRequest<MedicalFileEntry[]>(
    patientId === 'mine' ? '/medical-files' : `/medical-files?patientId=${patientId}`,
  )
}

// One entry (audited as MEDICAL_FILE_ENTRY_VIEWED). A hidden or missing one
// is a 404 — the backend doesn't say which.
export function fetchMedicalFileEntry(entryId: number) {
  return apiRequest<MedicalFileEntry>(`/medical-files/${entryId}`)
}

// --- MUTATIONS ---------------------------------------------------------------

export function createMedicalFileEntry(body: NewMedicalFileEntry) {
  // The body as an object: apiRequest serialises it (and sets the JSON
  // content type) itself.
  return apiRequest<MedicalFileEntry>('/medical-files', { method: 'POST', body })
}