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

import { z } from 'zod'
import { hasMessage } from '@/api/apiErrors'
import { currentPasswordField } from '@/auth/currentPassword'

// The rules and words of two-factor sign-in (MFA enrolment, Phase 6 —
// decisions §14), in one place for every screen that shows a code field:
// the two-factor page, the email and password changes, the sign-in step and
// the admin's reset.

export const TWO_FACTOR_PATH = '/profile/two-factor'

// --- THE BACKEND'S WORDS -----------------------------------------------------

// The refusals a code field can receive, mirrored from the backend
// (mfa/totp.ts, mfa/second-factor.ts, mfa/step-up.service.ts). Matched by
// status AND words (apiErrors.hasMessage), then shown AT the code field.
export const INVALID_CODE_MESSAGE = 'Invalid authentication code'
export const CODE_ALREADY_USED_MESSAGE =
  'This code has already been used — wait for your app to show a new one'
export const INVALID_RECOVERY_CODE_MESSAGE =
  'This recovery code is not valid, or has already been used'
export const CODE_REQUIRED_MESSAGE = 'Enter the 6-digit code from your authenticator app'
export const ALREADY_ON_MESSAGE = 'Two-factor sign-in is already on for this account'
export const NOT_ON_MESSAGE = 'Two-factor sign-in is not on for this account'

const CODE_REFUSALS = [
  INVALID_CODE_MESSAGE,
  CODE_ALREADY_USED_MESSAGE,
  INVALID_RECOVERY_CODE_MESSAGE,
  CODE_REQUIRED_MESSAGE,
]

// Is this refusal about the CODE that was typed? (400 from a step-up or a
// set-up, 401 from the sign-in step.) The words, when it is; null otherwise.
export function codeRefusal(error: unknown): string | null {
  for (const status of [400, 401]) {
    for (const message of CODE_REFUSALS) {
      if (hasMessage(error, status, message)) return message
    }
  }
  return null
}

// --- THE CODE FIELDS ---------------------------------------------------------

// The same two shapes the backend accepts (second-factor.ts): 6 digits, or a
// recovery code — 10 of the 31 symbols (no 0 / o, 1 / l / i), either case,
// a hyphen, a space or nothing between the two groups.
const APP_CODE = /^\d{6}$/
const RECOVERY_CODE = /^[a-hjkmnp-z2-9]{5}[- ]?[a-hjkmnp-z2-9]{5}$/i

export const SECOND_FACTOR_FORMAT_MESSAGE =
  'Enter the 6-digit code from your authenticator app, or one of your recovery codes'
export const APP_CODE_FORMAT_MESSAGE = 'Enter the 6-digit code from your authenticator app'

// A field that takes either (sign-in, turning off, new codes, the step-ups).
// Trimmed — a code pasted with a space around it — and SENT trimmed.
export const secondFactorField = z
  .string()
  .trim()
  .refine((code) => APP_CODE.test(code) || RECOVERY_CODE.test(code), {
    message: SECOND_FACTOR_FORMAT_MESSAGE,
  })

// Only an app code: confirming set-up proves the APP holds the new secret.
export const appCodeField = z.string().trim().regex(APP_CODE, APP_CODE_FORMAT_MESSAGE)

// --- THE FORMS ---------------------------------------------------------------

// Starting set-up: the password (the step-up — MFA is off, so no code).
export const startSetupSchema = z.object({ currentPassword: currentPasswordField })
export type StartSetupFormValues = z.infer<typeof startSetupSchema>

// Confirming set-up: the first code from the app.
export const confirmSetupSchema = z.object({ code: appCodeField })
export type ConfirmSetupFormValues = z.input<typeof confirmSetupSchema>

// New recovery codes, turning off, an admin's reset with MFA on: the
// password AND a second factor.
export const stepUpSchema = z.object({
  currentPassword: currentPasswordField,
  code: secondFactorField,
})
export type StepUpFormValues = z.input<typeof stepUpSchema>

// --- WORDS AND SMALL RULES ---------------------------------------------------

// The snackbars raised as the profile opens (decisions §33).
export const TWO_FACTOR_ON_NOTICE =
  'Two-factor sign-in is on. Any other devices signed in to your account are signed out.'
export const TWO_FACTOR_OFF_NOTICE =
  'Two-factor sign-in is off. Signing in now asks for your password only.'

// An authenticator app names the account by the label in the QR code it
// scanned — the email at the time — and never reads it again: after an email
// change it keeps showing the old one (decided with the person 2026-10-29:
// say so, keep the email as the label). The backend's "email changed" notice
// says the same in its own words (AUTHENTICATOR_LABEL_NOTE there).
export const AUTHENTICATOR_LABEL_TEXT =
  "Your authenticator app names this account by the email it had when you set it up. If you've changed your email since, the app still shows the old one — your codes keep working. To see the new address there, turn two-factor sign-in off and on again."

// The secret for typing into an app by hand, in groups of 4 — easier to read
// and to compare than 32 letters in a row. The app ignores the spaces.
export function groupSecret(secret: string): string {
  return secret.replace(/(.{4})(?=.)/g, '$1 ')
}

// "7 of 10 recovery codes left" — the profile row and the page.
export function recoveryCodesLeftText(remaining: number): string {
  if (remaining === 0) return 'No recovery codes left'
  if (remaining === 1) return '1 recovery code left'
  return `${remaining} recovery codes left`
}

// The downloaded file: what the codes are for, the account, the day they
// were made, and how to use one. Plain text, Windows line endings (it opens
// right in Notepad as well as everywhere else).
export function recoveryCodesFile(codes: string[], email: string, madeOn: Date): string {
  const day = madeOn.toLocaleDateString('en-CA') // YYYY-MM-DD, whatever the locale
  return [
    'Stride — two-factor recovery codes',
    `Account: ${email}`,
    `Made on: ${day}`,
    '',
    'Each code works once, instead of a code from your authenticator app.',
    'Keep them somewhere safe. Making new codes stops these from working.',
    '',
    ...codes,
    '',
  ].join('\r\n')
}