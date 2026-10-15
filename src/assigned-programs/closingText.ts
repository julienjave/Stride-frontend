import { formatShortDate } from '@/common/calendarDate'
import type { ClosingPlan } from './types'

// What the Complete / Cancel confirmation says, from the backend's own
// answer of what WOULD happen (GET …/closing — decided 2026-10-13: the
// outcome depends on facts the page can't see, so the server says it).
// Pure, so every outcome's wording is a plain test.
//
// Each text says what happens AND what doesn't (the pattern of the care-team
// dialogs): a closed program stays on the patient's record; only a program
// with no session at all disappears.

export interface ClosingText {
  title: string
  description: string
  // The confirm button: says the action as it will really happen —
  // "Delete program" when cancelling archives it.
  confirm: string
  // While the request runs.
  pending: string
}

// `openSessions` (the preview's count, Phase 4 step 1b): sessions in
// progress right now. Closing stops them — the patient can't finish a
// session of a closed program — so the dialog says it before the click.
export function closingText(
  action: 'cancel' | 'complete',
  plan: ClosingPlan,
  openSessions: number,
  today: string,
  locale?: string,
): ClosingText {
  if (plan.outcome === 'archived') {
    return {
      title: 'Delete this program?',
      description:
        "No session has been started yet, so cancelling deletes the program: it disappears from every list. There's nothing of it on the patient's record yet.",
      confirm: 'Delete program',
      pending: 'Deleting…',
    }
  }
  // An end date always comes with 'cancelled' / 'completed' (planClosing);
  // '' only satisfies the type.
  const end = plan.endDate ?? ''
  // Why today, when it is: closing is decided today, so the program usually
  // ends YESTERDAY (today mustn't become a missed day) — unless a session
  // was completed today, which makes today one of its days.
  const why = end === today ? ' — today, as a session was completed today' : ''
  const ending = `It will end on ${formatShortDate(end, locale)}${why}, and become read-only.${openSessionsText(openSessions)} Its sessions and progress stay on the patient's record; to go on with it later, assign it again.`
  return action === 'cancel'
    ? {
        title: 'Cancel this program?',
        description: ending,
        confirm: 'Cancel program',
        pending: 'Cancelling…',
      }
    : {
        title: 'Complete this program?',
        description: ending,
        confirm: 'Complete program',
        pending: 'Completing…',
      }
}

// The sentence about sessions in progress, with its leading space — or
// nothing at all when there is none. "Not finished" is the word the progress
// list then shows for such a session (attemptText), so the dialog promises
// exactly what the practitioner will see. The database allows ONE open
// session per program, so the plural is defensive: the count is the API's,
// and a screen words whatever number it's given.
//
// Never on the "Delete" outcome: deleting happens only when the program has
// no session at all, so none can be open (the caller doesn't add it there).
function openSessionsText(count: number): string {
  if (count === 0) return ''
  return count === 1
    ? " The patient's session in progress will be stopped, and kept as not finished."
    : ` The patient's ${count} sessions in progress will be stopped, and kept as not finished.`
}