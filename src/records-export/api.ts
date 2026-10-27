import { apiDownload, apiRequest } from '@/api/client'
import type { RecordsExportLinkSummary, SentRecordsExportLink } from './types'

// --- QUERY KEYS --------------------------------------------------------------

// One patient's emailed links (admins): ['records-export-links', patientId].
export function recordsExportLinksQueryKey(patientId: number) {
  return ['records-export-links', patientId] as const
}

// --- DOWNLOADS (each one a copy of the record, audited as RECORDS_EXPORTED) --

// The signed-in patient's own copy: GET /records-export?timeZone=… — no id
// (the backend takes the patient from the session). The time zone writes the
// copy's dates as the patient reads them (the backend would use UTC without
// one, and say so on the first page).
//
// URLSearchParams builds the query: it escapes what a URL can't hold as is
// ("America/Argentina/Buenos_Aires" has slashes, which must become %2F).
export function downloadMyRecords(timeZone: string) {
  return apiDownload(`/records-export?${new URLSearchParams({ timeZone }).toString()}`)
}

// The emailed link's copy: POST /records-export/download — PUBLIC (no
// session: the patient may be unable to sign in). The token and the date of
// birth travel in the BODY, never the URL: the backend's request log records
// every URL, and neither belongs in a log. A POST, though it hands back a
// file: it changes things (the link is spent, or a wrong date is counted).
export function downloadWithLink(values: { token: string; dateOfBirth: string; timeZone: string }) {
  return apiDownload('/records-export/download', { method: 'POST', body: values })
}

// --- THE ADMIN'S LINKS -------------------------------------------------------

// Every link sent to this patient, NEWEST FIRST.
export function listRecordsExportLinks(patientId: number) {
  return apiRequest<RecordsExportLinkSummary[]>(`/users/${patientId}/records-export-links`)
}

// Emails a new link to the address on the account, closing the open one (if
// any). 201 every time — a link is created even when its email fails
// (`emailSent: false`).
export function sendRecordsExportLink(patientId: number) {
  return apiRequest<SentRecordsExportLink>(`/users/${patientId}/records-export-links`, {
    method: 'POST',
  })
}