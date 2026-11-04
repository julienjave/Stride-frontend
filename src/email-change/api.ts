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

import { apiRequest } from '@/api/client'

// The backend's change-of-email routes (Phase 6, "Change email" — decisions
// §12), all under /auth/email-change. Self-service only: every call is about
// the signed-in account, or about one of the two emailed links.

// The open request the person can still confirm — the FULL new address: its
// reader is the account's owner, and it's how a typo is spotted. (The old
// inbox is sent it masked; that's another reader.)
export interface PendingEmailChange {
  newEmail: string
  createdAt: string
  expiresAt: string
}

export function fetchPendingEmailChange() {
  return apiRequest<{ pending: PendingEmailChange | null }>('/auth/email-change')
}

// 201 with the pending request — the same answer whether the address is free
// or already an account's (the backend reveals nothing; only the new inbox's
// email differs). `mfaCode` as for changing the password (password-change/
// api.ts): only for an account with two-factor sign-in on.
export function requestEmailChange(newEmail: string, currentPassword: string, mfaCode?: string) {
  return apiRequest<{ pending: PendingEmailChange }>('/auth/email-change', {
    method: 'POST',
    body: mfaCode === undefined
      ? { newEmail, currentPassword }
      : { newEmail, currentPassword, mfaCode },
  })
}

export function cancelPendingEmailChange() {
  return apiRequest<void>('/auth/email-change', { method: 'DELETE' })
}

// The link sent to the NEW address. The token in the BODY: a URL ends up in
// logs. Answers the address the account now signs in with.
export function confirmEmailChange(token: string) {
  return apiRequest<{ email: string }>('/auth/email-change/confirm', {
    method: 'POST',
    body: { token },
  })
}

// The link sent to the OLD address.
export function cancelEmailChangeByLink(token: string) {
  return apiRequest<void>('/auth/email-change/cancel', {
    method: 'POST',
    body: { token },
  })
}