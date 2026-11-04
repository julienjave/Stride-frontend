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

// The backend's change-of-password route (Phase 6, "Change password" —
// decisions §13). About the signed-in account only; both passwords in the
// BODY (a URL ends up in logs). 204: nothing to answer — this browser stays
// signed in; every other session of the account has ended.
//
// `mfaCode`: an account with two-factor sign-in on proves itself with a code
// too (an app code or a recovery code — decisions §14). Left out of the body
// when there is none, rather than sent empty: the backend refuses an empty
// code, and an absent one is "this account has no second factor".
export function changePassword(currentPassword: string, newPassword: string, mfaCode?: string) {
  return apiRequest<void>('/auth/password', {
    method: 'POST',
    body: mfaCode === undefined
      ? { currentPassword, newPassword }
      : { currentPassword, newPassword, mfaCode },
  })
}