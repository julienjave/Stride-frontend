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
