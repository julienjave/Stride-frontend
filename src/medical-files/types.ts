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

// The medical file's shapes, as the backend sends and takes them (Phase 6,
// decisions §8 — `src/medical-files/` on the backend). Hand-written like
// every response type in this app, checked against the live API.

// The three kinds of note — the backend's enum `medical_file_entry_type`.
export const ENTRY_TYPES = ['initial_assessment', 'progress_note', 'discharge_summary'] as const
export type EntryType = (typeof ENTRY_TYPES)[number]

// The four SOAP sections, in the order a note is written and read.
export const SECTIONS = ['subjective', 'objective', 'assessment', 'plan'] as const
export type Section = (typeof SECTIONS)[number]

// One entry (GET /medical-files, GET /medical-files/:id, POST's answer).
// - Each section is null when it wasn't written (a note may have only a
//   plan).
// - amendsId / amendmentReason: set on an AMENDMENT — the entry it corrects,
//   and why.
// - amendedById: set on an entry that HAS been amended — the id of the entry
//   that corrects it. An entry with `amendedById: null` is the latest
//   version of its note.
export interface MedicalFileEntry {
  id: number
  patientId: number
  entryType: EntryType
  subjective: string | null
  objective: string | null
  assessment: string | null
  plan: string | null
  createdAt: string
  author: { id: number; firstName: string; lastName: string }
  amendsId: number | null
  amendmentReason: string | null
  amendedById: number | null
}

// POST /medical-files — an ordinary entry, or (with both amend fields) an
// amendment. A section left out is "not written"; the backend refuses an
// entry with none.
export interface NewMedicalFileEntry {
  patientId: number
  entryType: EntryType
  subjective?: string
  objective?: string
  assessment?: string
  plan?: string
  amendsId?: number
  amendmentReason?: string
}