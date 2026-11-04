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