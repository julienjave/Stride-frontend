import { formatLinkMoment } from '@/records-export/recordsExportRules'
import type { PersonRef } from '@/records-export/types'
import type {
  ComplaintReviewStatus,
  ComplaintReviewSummary,
  OpenComplaintReviewBody,
} from './types'

// The complaint review screen's small rules (decisions §25, pass 2) — pure,
// so they're tested without a screen.

// --- The backend's numbers, mirrored -----------------------------------------
//
// Hand-written copies (complaint-reviews.schema.ts there): the form says them,
// and its maxLength stops typing at the same limit the server enforces.
export const REVIEW_DAYS = 7
export const REASON_MAX_LENGTH = 1000
export const CASE_REFERENCE_MAX_LENGTH = 100

// --- Words -------------------------------------------------------------------

export const STATUS_LABELS: Record<ComplaintReviewStatus, string> = {
  open: 'Open',
  ended: 'Ended early',
  expired: 'Expired',
}

export const REASON_REQUIRED = 'Say why you are opening this review.'

// The name a copy is saved under when the browser hides the server's.
export function fallbackFileName(reviewId: number): string {
  return `stride-review-copy-${reviewId}.pdf`
}

// "you" for the signed-in admin, the name for anyone else.
function who(person: PersonRef, myId: number): string {
  return person.id === myId ? 'you' : `${person.firstName} ${person.lastName}`
}

export interface ReviewDescription {
  // "Opened by you on 28 Oct 2026, 14:05."
  opened: string
  // How it stands or ended: "Open until …", "Ended by … on …", "Expired on …".
  end: string
  // Whether THIS admin may download copies with it now.
  canCopy: boolean
  // Why the button isn't there, for an open review someone else opened.
  copyNote: string | null
}

// One review as an admin reads it. Copies are personal to the opener (the
// review is THEIR stated reason); another admin sees who can make them —
// and can still end it.
export function describeReview(
  review: ComplaintReviewSummary,
  myId: number,
  locale?: string,
  timeZone?: string,
): ReviewDescription {
  const at = (value: string) => formatLinkMoment(value, locale, timeZone)
  const mine = review.openedBy.id === myId
  const opened = `Opened by ${who(review.openedBy, myId)} on ${at(review.openedAt)}.`
  let end: string
  switch (review.status) {
    case 'open':
      end = `Open until ${at(review.expiresAt)}.`
      break
    case 'ended':
      // Both are set together (a CHECK in the database); the fallbacks only
      // keep the types honest.
      end = `Ended by ${review.endedBy ? who(review.endedBy, myId) : 'an admin'} on ${at(review.endedAt ?? review.expiresAt)}.`
      break
    case 'expired':
      end = `Expired on ${at(review.expiresAt)}.`
      break
  }
  const open = review.status === 'open'
  return {
    opened,
    end,
    canCopy: open && mine,
    copyNote:
      open && !mine
        ? `Only ${review.openedBy.firstName} ${review.openedBy.lastName}, who opened it, can download copies with it.`
        : null,
  }
}

// --- The form ----------------------------------------------------------------

// The reason is required and must say something (spaces don't).
export function reasonError(reason: string): string | null {
  return reason.trim() === '' ? REASON_REQUIRED : null
}

// What is sent: both fields trimmed (the backend stores what it's sent), and
// an empty case reference left OUT — the backend refuses a blank one, since
// '' would otherwise be a second way of saying "none".
export function openReviewBody(reason: string, caseReference: string): OpenComplaintReviewBody {
  const reference = caseReference.trim()
  return reference === ''
    ? { reason: reason.trim() }
    : { reason: reason.trim(), caseReference: reference }
}
