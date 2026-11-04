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
