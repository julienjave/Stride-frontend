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

// Choosing a password, typed twice — the ONE rule for every page that sets
// one: accepting an invitation (the first password) and resetting a
// forgotten one (Phase 6). Mirrors the backend's DTOs (AcceptInvitationDto,
// ResetPasswordDto: 8–128 characters) for instant feedback — the backend
// still checks it. Same messages as the register-clinic form, so a password
// rule reads the same everywhere. (Moved here from invitations/schemas.ts
// when the reset page became its second user, 2026-10-21.)
export const newPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
    confirmPassword: z.string(),
  })
  // A refine on the whole object, not on one field, because the rule
  // involves two fields. `path` attaches the message to confirmPassword,
  // so it shows under that field.
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

export type NewPasswordFormValues = z.infer<typeof newPasswordSchema>