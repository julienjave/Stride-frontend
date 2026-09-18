import { z } from 'zod'
import {
  addressObjectShape,
  addAddressIssues,
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


// --- SELF-REGISTRATION ------------------------------------------------------

// Matches RegisterDto (email, password, firstName, lastName, dateOfBirth)
// PLUS one field the backend knows nothing about: confirmPassword. This is
// purely a client-side UX check — catching a typo'd password before a
// round trip, not something we ever send to the backend (see api.ts's
// register() function, which strips it out before calling apiRequest).
export const registerSchema = z
  .object({
    email: z.string().email('Enter a valid email address'),
    // Mirrors the backend's actual constraint (RegisterDto: 8–128 chars) —
    // catching a too-short password here is instant feedback instead of a
    // round trip just to learn the same thing.
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
    confirmPassword: z.string(),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    dateOfBirth: z.string().min(1, 'Date of birth is required'),
    // Both genuinely optional, per RegisterDto — .optional() means the KEY
    // may be absent from the parsed result, but note this does NOT stop an
    // untouched form input from producing an empty string '' here: RHF
    // reads whatever's currently in the DOM, and an empty text input's
    // value is '', not undefined. z.string() (with no .min()) happily
    // accepts '' as valid — so Zod alone can't tell "left blank" apart
    // from "typed then deleted." That distinction is handled one layer up,
    // in api.ts's register(), right before the request is sent — see the
    // comment there for why it matters.
    phone: z.string().max(50, 'Phone number is too long').optional(),
    ...addressObjectShape,
  })
  // .refine runs AFTER the per-field checks above all pass — this is for a
  // check that depends on MORE THAN ONE field at once, which a single
  // field's own validator can't express. `path: ['confirmPassword']`
  // controls which field the resulting error attaches to (so it renders
  // under the confirm-password input, not floating unattached).
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
  // A second, separate refinement step, chained after the first — Zod
  // composes .refine()/.superRefine() calls in sequence, so this doesn't
  // need to be merged into the one above. Same core-fields-required-
  // together rule as every other address-bearing form — see
  // common/address/schemas.ts.
  .superRefine(addAddressIssues)

export type RegisterFormValues = z.infer<typeof registerSchema>


// --- CLINIC BOOTSTRAP (register-clinic) -------------------------------------

// Matches RegisterClinicDto — two logically distinct groups of fields living
// in one flat object, same as the backend DTO itself: the clinic being
// created (clinicName/clinicEmail/clinicPhone/clinicWebsite/clinicAddress)
// and the founding admin account that gets created alongside it
// (email/password/firstName/lastName/position). A separate schema from
// registerSchema, not a shared/extended one — despite the overlapping field
// NAMES (email, password, firstName, lastName), these mean something
// different here (the admin's own account, always role=admin, created via a
// one-time bootstrap endpoint) than they do for a self-registering patient,
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
    // All four of these are genuinely optional per RegisterClinicDto — same
    // DOM-empty-string caveat as registerSchema's phone/address above
    // applies to every one of them: Zod alone can't tell "left blank" apart
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
    // Mirrors RegisterClinicDto's own constraint (8–128 chars), same
    // reasoning as registerSchema's password field: instant feedback
    // instead of a round trip to learn the same thing.
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