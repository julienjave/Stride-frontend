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

// The backend's two-factor routes (MFA enrolment — decisions §14). About the
// signed-in account, except the admin's reset. Passwords and codes in the
// BODY (a URL ends up in logs).

export interface MfaSetup {
  // The secret, for typing into an app by hand (shown once).
  secret: string
  otpauthUrl: string
  // A PNG data URL drawn by the backend — an <img src> as it is.
  qrCodeDataUrl: string
}

export interface RecoveryCodes {
  recoveryCodes: string[]
}

export function startMfaSetup(currentPassword: string) {
  return apiRequest<MfaSetup>('/auth/mfa/setup', { method: 'POST', body: { currentPassword } })
}

// Turns it on; answers the 10 recovery codes (shown once).
export function enableMfa(code: string) {
  return apiRequest<RecoveryCodes>('/auth/mfa/enable', { method: 'POST', body: { code } })
}

export function disableMfa(currentPassword: string, code: string) {
  return apiRequest<void>('/auth/mfa/disable', {
    method: 'POST',
    body: { currentPassword, code },
  })
}

export const recoveryCodesLeftQueryKey = ['mfa', 'recovery-codes'] as const

export function fetchRecoveryCodesLeft() {
  return apiRequest<{ remaining: number }>('/auth/mfa/recovery-codes')
}

export function regenerateRecoveryCodes(currentPassword: string, code: string) {
  return apiRequest<RecoveryCodes>('/auth/mfa/recovery-codes', {
    method: 'POST',
    body: { currentPassword, code },
  })
}

// An admin turning someone else's two-factor sign-in off. The ADMIN's own
// step-up: their password, and their code when their account has MFA on
// (sent only then — the backend refuses `null`).
export function resetUserMfa(userId: number, currentPassword: string, mfaCode?: string) {
  return apiRequest<void>(`/users/${userId}/mfa/reset`, {
    method: 'POST',
    body: mfaCode === undefined ? { currentPassword } : { currentPassword, mfaCode },
  })
}