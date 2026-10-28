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

// "Mark as reviewed" for a program's attendance alert (2026-10-19). Only
// `today` is sent — the day the alert is judged on; the server works out
// the facts being reviewed itself, so they're never the client's word.
export function reviewProgramAlert(programId: number, today: string) {
  return apiRequest<ProgramAlertReview>(`/alerts/programs/${programId}/review`, {
    method: 'POST',
    body: { today },
  })
}