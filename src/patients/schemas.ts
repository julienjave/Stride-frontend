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