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
import { sessionQueryKey } from '@/sessions/api'
import type { Alert, ProgramAlertReview, StaffSession } from './types'

// Every alerts query starts with 'alerts': one invalidation of the prefix
// refreshes the list whatever day it was asked for. `today` is part of the
// key because it is part of the question — tomorrow's answer is another
// one.
export const ALERTS_PREFIX = ['alerts'] as const

export function alertsQueryKey(today: string) {
  return [...ALERTS_PREFIX, today] as const
}

export function fetchAlerts(today: string) {
  return apiRequest<Alert[]>(`/alerts?today=${today}`)
}

// The care team's view of a session lives UNDER the patient's key
// (['sessions', id, 'staff']): the same resource, so invalidating
// ['sessions', id] refreshes both — but a different entry, because the
// answer differs (it has `reviews`) and so does its type.
export function staffSessionQueryKey(id: number) {
  return [...sessionQueryKey(id), 'staff'] as const
}

export function fetchStaffSession(id: number) {
  return apiRequest<StaffSession>(`/sessions/${id}`)
}

// "Mark as reviewed": no body — who reviews is the session's user, and
// when is the database's clock. Answers the session with its reviews.
export function reviewSession(id: number) {
  return apiRequest<StaffSession>(`/sessions/${id}/review`, { method: 'POST' })
}

// "Mark as reviewed" on a care-team join notice — no body: the server counts
// the 14 days on its own clock (a link starts at an instant).
export function reviewCareTeamJoin(linkId: number) {
  return apiRequest<{ reviewedAt: string }>(`/alerts/care-team-joins/${linkId}/review`, {
    method: 'POST',
  })
}

// "Mark as reviewed" on a complaint review's notice (decisions §25, pass 2) —
// no body either: a review opens at an instant too.
export function reviewComplaintReviewNotice(reviewId: number) {
  return apiRequest<{ reviewedAt: string }>(`/alerts/complaint-reviews/${reviewId}/review`, {
    method: 'POST',
  })
}

// "Mark as reviewed" on a legal disclosure's notice (decisions §25, pass 3)
// — no body: a disclosure is made at an instant.
export function reviewLegalDisclosureNotice(disclosureId: number) {
  return apiRequest<{ reviewedAt: string }>(`/alerts/legal-disclosures/${disclosureId}/review`, {
    method: 'POST',
  })
}

// "Mark as reviewed" on a patient merge's notice (decisions §27, pass 4) —
// no body: a merge happens at an instant.
export function reviewPatientMergeNotice(mergeId: number) {
  return apiRequest<{ reviewedAt: string }>(`/alerts/patient-merges/${mergeId}/review`, {
    method: 'POST',
  })
}

// "Mark as reviewed" for a program's attendance alert (2026-10-19). Only
// `today` is sent — the day the alert is judged on; the server works out
// the facts being reviewed itself, so they're never the client's word.
export function reviewProgramAlert(programId: number, today: string) {
  return apiRequest<ProgramAlertReview>(`/alerts/programs/${programId}/review`, {
    method: 'POST',
    body: { today },
  })
}