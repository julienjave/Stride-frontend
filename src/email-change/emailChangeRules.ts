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
import { secondFactorField } from '@/two-factor/twoFactorRules'

// Shared with changing the password (§13) since 2026-10-22 — re-exported so
// this feature's pages and tests keep one place to import from.
export { failureText, hasMessage } from '@/api/apiErrors'
export { WRONG_PASSWORD_MESSAGE } from '@/auth/currentPassword'

// The pure rules of the change-of-email screens (decisions §12): where the
// pages live, the form's checks, how a refusal is read, how the expiry reads.

export const CHANGE_EMAIL_PATH = '/profile/email'
export const CONFIRM_EMAIL_PATH = '/confirm-email'
export const CANCEL_EMAIL_CHANGE_PATH = '/cancel-email-change'

// The backend's own words (src/email-change/email-change.service.ts). The
// page reads WHICH refusal it got by its message, the way the reset page
// does: one status (400) carries several meanings.
export const DEAD_LINK_MESSAGE = 'This link is invalid or has expired'
export const SAME_EMAIL_MESSAGE = 'This is already your email address'
// A good confirm link whose address someone took since the request (409).
export const ADDRESS_TAKEN_MESSAGE =
  'This address now belongs to another Stride account, so your email was not changed'
// A cancel link of a change already confirmed (409): too late to stop it.
export const ALREADY_CONFIRMED_MESSAGE =
  'This change has already been confirmed. If you did not ask for it, contact your clinic.'

export function isDeadLink(error: unknown): boolean {
  return hasMessage(error, 400, DEAD_LINK_MESSAGE)
}

export function isAddressTaken(error: unknown): boolean {
  return hasMessage(error, 409, ADDRESS_TAKEN_MESSAGE)
}

export function isAlreadyConfirmed(error: unknown): boolean {
  return hasMessage(error, 409, ALREADY_CONFIRMED_MESSAGE)
}

// The form. The address is trimmed before it's checked and sent (the backend
// trims and lowercases A–Z too — its rule; the page doesn't repeat it). The
// password is sent exactly as typed: spaces may be part of it.
export const changeEmailSchema = z.object({
  newEmail: z
    .string()
    .trim()
    .min(1, 'Enter the new email address')
    .max(255, 'An email address can be at most 255 characters')
    .email('Enter a valid email address'),
  currentPassword: currentPasswordField,
})
export type ChangeEmailFormValues = z.input<typeof changeEmailSchema> & {
  // Only on the form of an account with two-factor sign-in on.
  mfaCode?: string
}

// The same form plus the code field, for an account with two-factor sign-in
// on (decisions §14).
export const changeEmailWithCodeSchema = changeEmailSchema.extend({ mfaCode: secondFactorField })

// "Fri, Oct 23, 2:31 PM" in the viewer's language and zone: the link lasts 24
// hours, so the day matters as much as the time.
export function formatLinkExpiry(expiresAt: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(expiresAt))
}