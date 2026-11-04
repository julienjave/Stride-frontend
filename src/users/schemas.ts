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
import { userRoleSchema } from '@/auth/schemas'
import { addressObjectShape, addAddressIssues } from '@/common/address/schemas'
import { tagDraftSchema, type TagRules } from '@/common/tagList'

// --- BASE FIELDS (every role needs these) -------------------------------

// Matches CreateUserDto's own constraints (@IsEmail, @MaxLength) — see
// users/dto/create-user.dto.ts on the backend. No password: accounts are
// created by invitation, and the person chooses their own password.
// Exported since the practitioner's invite-patient form (2026-10-08), which
// needs the same rule as this form.
export const emailSchema = z.string().email('Enter a valid email address')
// Exported: the profile page's per-field editors validate a single value
// against these SAME rules, and the invite-patient form builds on them too,
// so "what counts as a valid phone number" is written down exactly once.
export const firstNameSchema = z.string().min(1, 'First name is required').max(100, 'First name is too long')
export const lastNameSchema = z.string().min(1, 'Last name is required').max(100, 'Last name is too long')
export const phoneSchema = z.string().max(50, 'Phone number is too long')

// --- ROLE-SPECIFIC FIELDS ------------------------------------------------

export const licenseNumberSchema = z.string().max(100, 'License number is too long')
export const bioSchema = z.string().max(2000, 'Bio is too long')
// No .min(1) here — deliberately. Requiredness for THIS field is entirely
// superRefine's job below (it's only required for patients, and needs a
// role-aware message: "Date of birth is required for patients," not a
// generic one). A base-schema .min(1) would fire its OWN, less specific
// error first, before superRefine's custom issue ever gets a chance to —
// exactly the bug this comment is here to prevent someone re-introducing.
const dateOfBirthSchema = z.string()
export const positionSchema = z.string().max(100, 'Position is too long')

// --- EDITING AN EXISTING PROFILE (one field at a time) --------------------

// licenseNumber and dateOfBirth have NO .min(1) above, on purpose: in the
// create/grant forms their requiredness depends on the chosen role, so
// superRefine owns it (see the comment on dateOfBirthSchema). When editing
// an existing profile there's no role choice left — the account already
// holds the role, and the database column is NOT NULL — so the field is
// simply required. These two add that rule on top of the shared base.
//
// Why it matters beyond the message: EditableField decides "can this field
// be cleared?" by asking the schema whether '' is valid. A schema that
// accepts '' would let the page send `null` for a NOT NULL column (the
// backend now answers that with a 400, but the page shouldn't even try).
export const requiredLicenseNumberSchema = licenseNumberSchema.min(1, 'License number is required')
export const requiredDateOfBirthSchema = dateOfBirthSchema.min(1, 'Date of birth is required')

// One specialty, as an item of the tag input. Mirrors UpdateUserDto's
// `@IsString({ each: true }) @MaxLength(100, { each: true })`, plus a
// non-empty rule (a blank tag is never meaningful). .trim() runs BEFORE
// the length checks, so "  " counts as empty, not as two characters.
export const specialtySchema = z
  .string()
  .trim()
  .min(1, 'Enter a specialty')
  .max(100, 'Each specialty must be 100 characters or fewer')

// Mirrors @ArrayMaxSize(20) — the same on CreateUserDto, GrantRoleDto and
// UpdateUserDto.
export const MAX_SPECIALTIES = 20

// The two rules above as one object, in the shape the tag components and
// tagDraftSchema take — so every place specialties are entered (profile,
// create user, grant role) applies exactly the same rules.
export const SPECIALTY_RULES: TagRules = {
  itemSchema: specialtySchema,
  maxItems: MAX_SPECIALTIES,
}

// Specialties inside the create/grant forms: the form holds the tag
// input's whole draft (chips + unconfirmed text), and this turns it into
// the string[] sent to the API — including any text left in the box.
// .optional(): the field only exists while "practitioner" is selected
// (shouldUnregister drops it otherwise).
const specialtiesDraftSchema = tagDraftSchema(SPECIALTY_RULES).optional()

// --- THE CREATE FORM ------------------------------------------------------

// A single flat object, not a z.discriminatedUnion on `role` — deliberately
// mirroring CreateUserDto's own shape on the backend, which is one DTO
// class with @ValidateIf-conditional fields, not a union of three DTOs.
// Keeping the same modeling choice on both sides means "which fields are
// required for which role" lives as one set of rules, not two different
// representations of the same rules that could quietly drift apart.
//
// Every role-specific field is declared .optional() here at the object
// level — the REAL enforcement of "actually required for THIS role" lives
// entirely in .superRefine() below. This is the same reason CreateClinicDto
// on the backend uses @ValidateIf rather than making a field's base
// decorator conditional: the object's shape can't change per-instance, only
// what's asserted about a given instance's fields.
const baseObjectSchema = z.object({
  email: emailSchema,
  role: userRoleSchema,
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  phone: phoneSchema.optional(),
  ...addressObjectShape,
  licenseNumber: licenseNumberSchema.optional(),
  specialties: specialtiesDraftSchema,
  bio: bioSchema.optional(),
  dateOfBirth: dateOfBirthSchema.optional(),
  position: positionSchema.optional(),
  // A native <select>'s value is always a string, even when every option
  // represents a number — HTML form controls don't have a concept of a
  // typed value. z.coerce.number() converts that string to an actual
  // number during validation (and Number('') is NaN, which coerce still
  // produces — .optional() alone wouldn't reject that, which is exactly
  // why the "no clinic selected" case is handled as '' explicitly in
  // superRefine below, BEFORE coercion would ever turn it into NaN).
  clinicId: z.string().optional(),
})

export const createUserSchema = baseObjectSchema.superRefine((data, ctx) => {
  if (data.role === 'practitioner') {
    if (!data.licenseNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['licenseNumber'],
        message: 'License number is required for practitioners',
      })
    }
    // Deliberately stricter than the backend here — CreateUserDto itself
    // allows clinicId to be omitted for every role, but a practitioner
    // created with no clinic has no way to ever be assigned a patient
    // (their roster is clinic-scoped — see UsersController.findAll's own
    // comment) and can't legally add one themselves either (they can only
    // add patients to a clinic they already belong to). Skipping this
    // wouldn't just be an incomplete profile, it'd be a structurally
    // unusable account from the moment it's created.
    if (!data.clinicId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['clinicId'],
        message: 'Select a clinic for this practitioner',
      })
    }
  }

  if (data.role === 'patient') {
    if (!data.dateOfBirth) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dateOfBirth'],
        message: 'Date of birth is required for patients',
      })
    }
    // Same reasoning as the practitioner case above: a patient with no
    // clinic can never be matched to a practitioner at all — every
    // permission check that lets a practitioner see/manage a patient
    // (isPatientManagedBy) works entirely through shared clinic
    // membership. No clinic means no practitioner can ever reach them.
    if (!data.clinicId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['clinicId'],
        message: 'Select a clinic for this patient',
      })
    }
  }

  // Admins are NOT required to have a clinic — admin access in this app
  // isn't clinic-scoped anywhere (every admin-bypass check in the backend
  // confirms this), so leaving clinicId blank for an admin is a normal,
  // supported case, not an oversight.

  // Same core-fields-required-together rule as every other address-
  // bearing form — see common/address/schemas.ts. Called from inside
  // this existing superRefine, rather than a second chained one, since
  // it needs no data this callback doesn't already have.
  addAddressIssues(data, ctx)
})

// Two types, because the specialties transform makes them differ:
//   - the INPUT is what the form holds while it's being filled in
//     (specialties as a TagDraft — chips plus typed text);
//   - the OUTPUT (z.infer) is what the submit handler receives after
//     validation (specialties as a plain string[]).
// useForm takes both (see CreateUserPage).
export type CreateUserFormInput = z.input<typeof createUserSchema>
export type CreateUserFormValues = z.infer<typeof createUserSchema>

// --- GRANTING AN ADDITIONAL ROLE TO AN EXISTING USER ---------------------

// Reuses licenseNumberSchema/bioSchema/dateOfBirthSchema/positionSchema
// from above — same fields, same rules, same reason as always: one
// source of truth per validation rule, not two copies that could drift.
// No email/password/firstName/lastName here (this user already has
// those), and deliberately no clinicId either — GrantRoleDto on the
// backend has no such field at all. Granting a role and managing clinic
// membership are cleanly separate concerns; this form doesn't reach into
// UserClinicMemberships' territory.
const grantRoleBaseSchema = z.object({
  role: userRoleSchema,
  licenseNumber: licenseNumberSchema.optional(),
  specialties: specialtiesDraftSchema,
  bio: bioSchema.optional(),
  dateOfBirth: dateOfBirthSchema.optional(),
  position: positionSchema.optional(),
})

export const grantRoleSchema = grantRoleBaseSchema.superRefine((data, ctx) => {
  if (data.role === 'practitioner' && !data.licenseNumber) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['licenseNumber'],
      message: 'License number is required for practitioners',
    })
  }
  if (data.role === 'patient' && !data.dateOfBirth) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dateOfBirth'],
      message: 'Date of birth is required for patients',
    })
  }
})

// Input vs output — same reason as CreateUserFormInput above.
export type GrantRoleFormInput = z.input<typeof grantRoleSchema>
export type GrantRoleFormValues = z.infer<typeof grantRoleSchema>