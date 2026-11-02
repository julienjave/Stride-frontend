// "Where to go after signing in" — the page someone was on (or was trying
// to open) when they were sent to the sign-in page, carried in the
// navigation's state as `from`, and WHOSE page it was, as `fromUserId`.
//
// WHY THE OWNER (found by the person in live testing, 2026-11-02): when
// Alex signed out on a patient's page, the sign-in page kept that page as
// `from` — RequireAuth's own redirect, which fires the moment the cached
// user becomes `null` — and whoever signed in NEXT on that browser was sent
// to Alex's last page instead of their own home. On a shared clinic
// computer that's another practitioner opening Alex's patient (refused by
// the backend, but the address — a patient id — and the confusion remain).
//
// The rule: a remembered page is honoured only for the person it belonged
// to. Alex signing back in returns to it (what `from` is for: a session that
// expired mid-work, then the same person resumes); anyone else goes home.
// A page with no known owner — someone opening a link or a bookmark while
// signed out — is honoured for whoever signs in, as before.

export interface ReturnState {
  from: string
  // The account that was signed in when the page was left; absent when
  // nobody was (a link opened while signed out).
  fromUserId?: number
}

// The last account seen signed in, in THIS tab — the owner RequireAuth
// writes into its redirect when the cached user turns `null` (by then the
// cache no longer says who it was). Module memory, like
// rememberSignOutReason: it lives as long as the page, and a reload starts
// with nobody, which is right — a reload that finds no session has no owner
// to name.
let lastSignedInUserId: number | undefined

export function rememberSignedInUser(userId: number): void {
  lastSignedInUserId = userId
}

// For tests, which share the module between cases.
export function forgetSignedInUser(): void {
  lastSignedInUserId = undefined
}

// The state for a redirect to the sign-in page from `from`.
export function returnState(from: string, ownerId = lastSignedInUserId): ReturnState {
  return ownerId === undefined ? { from } : { from, fromUserId: ownerId }
}

// Where the person who just signed in goes: the remembered page if it's
// theirs (or nobody's), else their home ('/', which DashboardRedirect turns
// into the right role's home).
//
// `state` is whatever the navigation carried — typed `unknown` by React
// Router — so each field is checked, not assumed.
export function destinationAfterSignIn(state: unknown, userId: number): string {
  if (typeof state !== 'object' || state === null) return '/'
  const { from, fromUserId } = state as { from?: unknown; fromUserId?: unknown }
  if (typeof from !== 'string') return '/'
  if (fromUserId !== undefined && fromUserId !== userId) return '/'
  return from
}