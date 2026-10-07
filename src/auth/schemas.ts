import { z } from 'zod'
import {
  addressLine1Schema,
  addressLine2Schema,
  addressCitySchema,
  addressStateSchema,
  addressPostalCodeSchema,
  addressCountrySchema,
} from '@/common/address/schemas'


// --- LOGIN -----------------------------------------------------------------

// Matches the backend's UserRole enum exactly (see CreateUserDto's role
// field in types.generated.ts) — reused both for validating the login
// form's optional role field AND for rendering the role-picker's buttons,
// so there's one definition of "what a valid role even is," not two.
export const userRoleSchema = z.enum(['admin', 'practitioner', 'patient'])
export type UserRole = z.infer<typeof userRoleSchema>

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  role: userRoleSchema.optional(),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const mfaCodeSchema = z.object({
  code: z
    .string()
    .length(6, 'Enter the 6-digit code')
    .regex(/^\d+$/, 'Code must be numbers only'),
})

export type MfaCodeFormValues = z.infer<typeof mfaCodeSchema>


// --- CLINIC BOOTSTRAP (register-clinic) -------------------------------------

// Matches RegisterClinicDto — two logically distinct groups of fields living
// in one flat object, same as the backend DTO itself: the clinic being
// created (clinicName/clinicEmail/clinicPhone/clinicWebsite/clinicAddress)
// and the founding admin account that gets created alongside it
// (email/password/firstName/lastName/position). A separate schema from
// the user-creation schemas, not a shared/extended one — despite the overlapping field
// NAMES (email, password, firstName, lastName), these mean something
// different here (the admin's own account, always role=admin, created via a
// one-time bootstrap endpoint) than they did for the self-registering patient
// of the (since removed) public registration form,
// and the two forms will keep diverging (this one will never grow a
// dateOfBirth field, for instance). Sharing a base would couple two things
// that only coincidentally look alike today.
// Mirrors the backend's hasStartedClinicAddress adapter in
// register-clinic.dto.ts exactly, and for the identical reason:
// addAddressIssues (common/address/schemas.ts) checks and reports errors
// against the STANDARD addressLine1/addressCity/etc. keys — calling it
// directly against this form's clinicAddress*-prefixed fields would
// either miss them entirely or attach errors to fields that don't exist
// on this form. This small, separate function duplicates the four-issue
// logic under the right names instead.
function addClinicAddressIssues(
  data: {
    clinicAddressLine1?: string
    clinicAddressCity?: string
    clinicAddressPostalCode?: string
    clinicAddressCountry?: string
  },
  ctx: z.RefinementCtx,
) {
  const hasStarted =
    !!data.clinicAddressLine1 ||
    !!data.clinicAddressCity ||
    !!data.clinicAddressPostalCode ||
    !!data.clinicAddressCountry
  if (!hasStarted) return

  if (!data.clinicAddressLine1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['clinicAddressLine1'],
      message: 'Address line 1 is required',
    })
  }
  if (!data.clinicAddressCity) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['clinicAddressCity'],
      message: 'City is required',
    })
  }
  if (!data.clinicAddressPostalCode) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['clinicAddressPostalCode'],
      message: 'Postal code is required',
    })
  }
  if (!data.clinicAddressCountry) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['clinicAddressCountry'],
      message: 'Country is required',
    })
  }
}

export const registerClinicSchema = z
  .object({
    // --- Clinic fields ---
    clinicName: z.string().min(1, 'Clinic name is required').max(255, 'Clinic name is too long'),
    clinicEmail: z.string().email('Enter a valid clinic email address'),
    // All four of these are genuinely optional per RegisterClinicDto — and
    // an untouched text input reads as '' (empty string), not undefined: Zod alone can't tell "left blank" apart
    // from "typed then deleted," so the '' → undefined conversion still has
    // to happen one layer up, in api.ts's registerClinic(), right before
    // the request is built.
    clinicPhone: z.string().max(50, 'Phone number is too long').optional(),
    clinicWebsite: z.string().max(255, 'Website is too long').optional(),
    // Prefixed clinicAddress* fields, not the shared addressObjectShape —
    // this form carries the CLINIC's address, a differently-named field
    // set from the standard addressLine1/addressCity/etc. shape (which is
    // reserved for a PERSON's own address elsewhere in this app). Reuses
    // the same field-level schemas (addressLine1Schema etc.) for the
    // exact same length/format constraints, just under different keys —
    // mirrors the backend's RegisterClinicDto, which has this identical
    // two-different-prefixes-in-one-DTO shape for the same reason.
    clinicAddressLine1: addressLine1Schema.optional(),
    clinicAddressLine2: addressLine2Schema.optional(),
    clinicAddressCity: addressCitySchema.optional(),
    clinicAddressState: addressStateSchema.optional(),
    clinicAddressPostalCode: addressPostalCodeSchema.optional(),
    clinicAddressCountry: addressCountrySchema.optional(),

    // --- Founding admin fields ---
    email: z.string().email('Enter a valid email address'),
    // Mirrors RegisterClinicDto's own constraint (8–128 chars): instant
    // feedback instead of a round trip to learn the same thing.
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
    confirmPassword: z.string(),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    // Optional job-title field (e.g. "Practice Owner") — distinct from the
    // phone/address fields deliberately left OFF this form entirely (see
    // RegisterClinicPage): position is role/title information, not contact
    // information, so it doesn't fall under the "defer contact details to a
    // later profile-edit screen" decision the same way phone/address did.
    position: z.string().max(100, 'Position is too long').optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
  .superRefine(addClinicAddressIssues)

export type RegisterClinicFormValues = z.infer<typeof registerClinicSchema>