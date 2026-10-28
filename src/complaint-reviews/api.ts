import { apiDownload, apiRequest } from '@/api/client'
import type { ComplaintReviewSummary, OpenComplaintReviewBody } from './types'

// --- QUERY KEYS --------------------------------------------------------------

// One patient's complaint reviews (admins): ['complaint-reviews', patientId].
export function complaintReviewsQueryKey(patientId: number) {
  return ['complaint-reviews', patientId] as const
}

// --- THE ADMIN'S REVIEWS -----------------------------------------------------

// Every review of this patient's record, NEWEST FIRST, reasons included.
export function listComplaintReviews(patientId: number) {
  return apiRequest<ComplaintReviewSummary[]>(`/users/${patientId}/complaint-reviews`)
}

// Opens a review for 7 days (the server's clock decides both ends).
export function openComplaintReview(patientId: number, body: OpenComplaintReviewBody) {
  return apiRequest<ComplaintReviewSummary>(`/users/${patientId}/complaint-reviews`, {
    method: 'POST',
    body,
  })
}

// Ends one before its time — any admin may.
export function endComplaintReview(patientId: number, reviewId: number) {
  return apiRequest<ComplaintReviewSummary>(
    `/users/${patientId}/complaint-reviews/${reviewId}/end`,
    { method: 'POST' },
  )
}

// A review copy: the patient's record as a stamped PDF — only for the admin
// who opened the review, while it's open. Each one is a new copy, audited by
// the backend (RECORDS_EXPORTED, via complaint_review). The time zone writes
// its moments as the admin reads them; URLSearchParams escapes its slashes.
export function downloadReviewCopy(patientId: number, reviewId: number, timeZone: string) {
  return apiDownload(
    `/users/${patientId}/complaint-reviews/${reviewId}/copy?${new URLSearchParams({ timeZone }).toString()}`,
  )
}
