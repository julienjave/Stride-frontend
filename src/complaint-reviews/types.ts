import type { PersonRef } from '@/records-export/types'

// The complaint review's shapes as the backend answers them (decisions §25,
// pass 2; the backend's src/complaint-reviews/). Hand-written, like every
// response type in the app.

// Derived by the backend from the review's timestamps, never stored:
//   open    — the admin who opened it can download copies;
//   ended   — an admin ended it before its 7 days;
//   expired — its 7 days are over.
export type ComplaintReviewStatus = 'open' | 'ended' | 'expired'

// One review, as GET /users/:id/complaint-reviews lists them (admins only —
// so the reason is here; the care team's notice never carries it). Moments
// arrive as ISO strings.
export interface ComplaintReviewSummary {
  id: number
  status: ComplaintReviewStatus
  reason: string
  caseReference: string | null
  openedBy: PersonRef
  openedAt: string
  expiresAt: string
  endedAt: string | null
  endedBy: PersonRef | null
}

// What POST /users/:id/complaint-reviews takes. `caseReference` is left out
// when there is none (the backend refuses a blank one).
export interface OpenComplaintReviewBody {
  reason: string
  caseReference?: string
}
