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

// The records export's shapes as the backend answers them (decisions §20;
// the backend's src/records-export/). Hand-written, like every response type
// in the app.

// Derived by the backend from the link's timestamps and its count of wrong
// dates of birth — never stored (records-export-link-status.ts there):
//   open     — can still be used;
//   used     — the record was downloaded with it (once is all it allows);
//   replaced — a newer link was sent, which closed this one;
//   locked   — five wrong dates of birth;
//   expired  — 72 hours passed without any of the above.
export type RecordsExportLinkStatus = 'open' | 'used' | 'replaced' | 'locked' | 'expired'

// Why a link can't be used — the 410's `reason` (every status but open).
export type UnusableLinkReason = Exclude<RecordsExportLinkStatus, 'open'>

export interface PersonRef {
  id: number
  firstName: string
  lastName: string
}

// One link, as GET /users/:id/records-export-links lists them (admins) —
// never its token. Moments arrive as ISO strings (JSON has no date type).
export interface RecordsExportLinkSummary {
  id: number
  status: RecordsExportLinkStatus
  createdAt: string
  expiresAt: string
  // When the mail server accepted the email; null = it couldn't be sent, so
  // the patient never received this link.
  emailSentAt: string | null
  usedAt: string | null
  replacedAt: string | null
  dateOfBirthFailures: number
  sentBy: PersonRef
}

// POST /users/:id/records-export-links: the new link, and whether its email
// went out. false is not an error — the link exists; another can be sent.
export interface SentRecordsExportLink extends RecordsExportLinkSummary {
  emailSent: boolean
}