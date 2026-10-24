import { describe, expect, it } from 'vitest'
import {
  forgetSignOutReason,
  rememberSignOutReason,
  STEP_UP_SIGNED_OUT_MESSAGE,
  wasSignedOutAfterStepUps,
} from './currentPassword'

// The mirror of the backend's words (src/mfa/step-up.service.ts) — spelled
// out here, so a change on one side only fails a test instead of silently
// dropping the notice.
it("mirrors the backend's sign-out words exactly", () => {
  expect(STEP_UP_SIGNED_OUT_MESSAGE).toBe(
    'Too many wrong attempts: you have been signed out. Sign in again to continue.',
  )
})

// Why the last mid-session 401 signed the person out (decisions §16): the
// app's 401 handler remembers it, the sign-in page reads it once.
describe('the sign-out reason', () => {
  it('is remembered for the step-up sign-out, until forgotten', () => {
    rememberSignOutReason([STEP_UP_SIGNED_OUT_MESSAGE])
    expect(wasSignedOutAfterStepUps()).toBe(true)
    // Reading doesn't spend it (StrictMode may read twice).
    expect(wasSignedOutAfterStepUps()).toBe(true)
    forgetSignOutReason()
    expect(wasSignedOutAfterStepUps()).toBe(false)
  })

  // Any other 401 (a session that expired, or ended elsewhere) replaces an
  // older reason — it never lingers into the wrong sign-out.
  it('is cleared by any other 401', () => {
    rememberSignOutReason([STEP_UP_SIGNED_OUT_MESSAGE])
    rememberSignOutReason(['Unauthorized'])
    expect(wasSignedOutAfterStepUps()).toBe(false)
    rememberSignOutReason([STEP_UP_SIGNED_OUT_MESSAGE])
    rememberSignOutReason([])
    expect(wasSignedOutAfterStepUps()).toBe(false)
  })
})