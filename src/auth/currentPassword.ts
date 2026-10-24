import { z } from 'zod'

// "Step-up": the forms that could hand the account to someone else ask the
// CURRENT password again, even though the person is signed in — changing the
// sign-in email (decisions §12) and changing the password (§13). The
// backend's rule lives in one place (src/common/current-password.ts); its
// refusal is mirrored here once, so both forms recognise it the same way.

export const WRONG_PASSWORD_MESSAGE = 'Your current password is not correct'

// The 5th wrong password or code in a row signs the session out (decisions
// §16, privacy and security pass 2): the backend answers 401 with these
// words. Mirrored here so the sign-in page can say why the person landed
// there — an unexplained sign-out in the middle of a form looks like a bug.
export const STEP_UP_SIGNED_OUT_MESSAGE =
  'Too many wrong attempts: you have been signed out. Sign in again to continue.'

// Why the last mid-session 401 signed the person out — remembered at MODULE
// level by the app's 401 handler (app/routes.tsx), read once by the sign-in
// page for its notice.
//
// Why not in the navigation's state, like the reset page's notice: a 401
// sends the person to sign-in TWICE at once. The handler navigates there,
// and clearing the cached user (which it must do first, or the sign-in page
// would bounce a "still signed in" person straight back) makes the page's
// guard, RequireAuth, redirect there too — with its own state, `{ from }`.
// Whichever lands last wins, and in Chromium it was the guard's: the flag
// was lost (found walking the screens; jsdom tests, rendering no guard,
// passed). A module variable doesn't care which navigation wins.
let signedOutAfterStepUps = false

// Called with every mid-session 401's words: true for the step-up's
// sign-out, false for any other 401 (so an older reason never lingers).
export function rememberSignOutReason(message: string[]): void {
  signedOutAfterStepUps = message.includes(STEP_UP_SIGNED_OUT_MESSAGE)
}

// A pure read — safe in a useState initialiser (StrictMode may run it twice).
export function wasSignedOutAfterStepUps(): boolean {
  return signedOutAfterStepUps
}

// Once the sign-in page has shown it: a later visit says nothing of it.
export function forgetSignOutReason(): void {
  signedOutAfterStepUps = false
}

// Sent exactly as typed — never trimmed: spaces may be part of a password.
export const currentPasswordField = z.string().min(1, 'Enter your current password')