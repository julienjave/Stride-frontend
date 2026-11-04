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

import type { PersonRef } from '@/records-export/types'

// The legal disclosure's shapes as the backend answers them (decisions §25,
// pass 3; the backend's src/legal-disclosures/). Hand-written, like every
// response type in the app.

// Why the law let the clinic release the record without the patient's
// approval — HIPAA 164.512's cases a clinic can meet, and "other" (with an
// explanation).
export type LegalBasis =
  | 'court_order'
  | 'subpoena'
  | 'required_by_law'
  | 'law_enforcement'
  | 'health_oversight'
  | 'coroner'
  | 'other'

// What a disclosure can hold, in the order every list shows them. Messages
// leave the app ONLY in a disclosure.
export type DisclosurePart = 'medical_file' | 'programs' | 'sessions' | 'messages'

// What the PATIENT sees — their accounting of disclosures: who received it,
// why, when, what. Days ('YYYY-MM-DD') for the period; an instant for madeAt.
export interface OwnLegalDisclosure {
  id: number
  madeAt: string
  recipientName: string
  recipientOrganisation: string | null
  legalBasis: LegalBasis
  basisExplanation: string | null
  parts: DisclosurePart[]
  periodFrom: string | null
  periodTo: string | null
}

// What an ADMIN sees: everything, the order and the hold included.
export interface LegalDisclosureSummary extends OwnLegalDisclosure {
  madeBy: PersonRef
  orderReference: string | null
  receivedOn: string
  // The moment the patient may see it (null: no hold) …
  withheldUntil: string | null
  // … and whether they can now, by the server's clock.
  shownToPatient: boolean
  withholdingStatement: string | null
}

// What POST /users/:id/legal-disclosures takes. Optional fields are LEFT OUT
// when empty — the backend refuses a blank one.
export interface MakeLegalDisclosureBody {
  recipientName: string
  recipientOrganisation?: string
  legalBasis: LegalBasis
  basisExplanation?: string
  orderReference?: string
  receivedOn: string
  parts: DisclosurePart[]
  periodFrom?: string
  periodTo?: string
  withheldUntil?: string
  withholdingStatement?: string
  timeZone: string
}
