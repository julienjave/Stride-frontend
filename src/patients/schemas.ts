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
import {
  emailSchema,
  firstNameSchema,
  lastNameSchema,
  requiredDateOfBirthSchema,
} from '@/users/schemas'

// The practitioner's "Invite a new patient" form. Deliberately SMALLER than
// the admin's create-user form: the four things needed to create the
// account and tell this patient apart from others (names, date of birth)
// plus where the invitation goes (email) and which clinic they join. Phone
// and address can be added afterwards on the patient's page — or by the
// patient themselves once they've accepted.
//
// Every field reuses the admin form's rule (users/schemas.ts), so "a valid
// first name" can't mean two different things in two forms.
export const invitePatientSchema = z.object({
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  email: emailSchema,
  dateOfBirth: requiredDateOfBirthSchema,
  // A select's value is a string (see users/schemas.ts) — '' until chosen.
  // The message differs from the select's placeholder ("Select a clinic")
  // on purpose: the same words twice on screen read as one thing.
  // Required: the backend refuses a practitioner-created patient without a
  // clinic (it must be one of the practitioner's own, so that they share
  // it — the care-team link needs a shared clinic to give any access).
  clinicId: z.string().min(1, 'Select a clinic for this patient'),
})

// No transforms in this schema, so what the form holds and what the submit
// handler receives are the same type (unlike the create-user form, whose
// specialties field transforms — see the comment above
// CreateUserFormInput).
export type InvitePatientFormValues = z.infer<typeof invitePatientSchema>