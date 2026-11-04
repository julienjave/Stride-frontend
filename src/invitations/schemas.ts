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

// The accept page's form: the person's first password, typed twice — the
// shared rule for choosing a password (auth/newPasswordSchema.ts, also used
// by the reset page). Kept under the invitation's own name, so the accept
// page and its tests read as before.
export {
  newPasswordSchema as acceptInvitationSchema,
  type NewPasswordFormValues as AcceptInvitationFormValues,
} from '@/auth/newPasswordSchema'