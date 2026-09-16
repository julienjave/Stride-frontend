import { z } from 'zod'
import { userRoleSchema } from '@/auth/schemas'

// --- BASE FIELDS (every role needs these) -------------------------------

// Matches CreateUserDto's own constraints (@IsEmail, @MinLength(8),
// @MaxLength) exactly — see users/dto/create-user.dto.ts on the backend.
const emailSchema = z.string().email('Enter a valid email address')
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
const firstNameSchema = z.string().min(1, 'First name is required').max(100, 'First name is too long')
const lastNameSchema = z.string().min(1, 'Last name is required').max(100, 'Last name is too long')
const phoneSchema = z.string().max(50, 'Phone number is too long')
const addressSchema = z.string().max(500, 'Address is too long')

// --- ROLE-SPECIFIC FIELDS ------------------------------------------------

const licenseNumberSchema = z.string().min(1).max(100, 'License number is too long')
const bioSchema = z.string().max(2000, 'Bio is too long')
const dateOfBirthSchema = z.string().min(1, 'Date of birth is required')
const positionSchema = z.string().max(100, 'Position is too long')

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
  password: passwordSchema,
  role: userRoleSchema,
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  phone: phoneSchema.optional(),
  address: addressSchema.optional(),
  licenseNumber: licenseNumberSchema.optional(),
  specialties: z.string().optional(), // raw comma-separated input; split into an array in api.ts, not here
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
})

export type CreateUserFormValues = z.infer<typeof createUserSchema>