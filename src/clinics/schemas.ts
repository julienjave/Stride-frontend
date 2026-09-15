import { z } from 'zod'

// Each of these five is the ONE place the corresponding field's validation
// rule is written down — matching CreateClinicDto's own constraints
// (@MaxLength, @IsEmail) — and every consumer of that field reuses the
// exact same schema object rather than re-declaring the rule.
//
// This split (bare field schemas, not wrapped in .optional() here) exists
// specifically because this feature needs the SAME rule in two different
// contexts: once inside createClinicSchema below (a normal single-submit
// form), and once standalone, called directly against a single typed
// value, in the clinic edit view's per-field inline editing (built in a
// later piece) — e.g. clinicPhoneSchema.safeParse(justThatOneFieldsValue).
// A single combined "updateClinicSchema" object existed briefly in an
// earlier draft of this plan, kept around only so the edit view could
// reach into its .shape.phone — but that's an object built solely to be
// taken apart again, one extra layer of indirection for no real benefit.
// Exporting the field schemas directly is the simpler shape: there was
// never a need for an "update object" at all, just the individual rules.
export const clinicNameSchema = z
  .string()
  .min(1, 'Clinic name is required')
  .max(255, 'Clinic name is too long')

export const clinicEmailSchema = z.string().email('Enter a valid clinic email address')

export const clinicPhoneSchema = z.string().max(50, 'Phone number is too long')

export const clinicAddressSchema = z.string().max(500, 'Address is too long')

export const clinicWebsiteSchema = z.string().max(255, 'Website is too long')

// The create form's schema — the ONLY place these five get assembled into
// a single object, because creating a clinic really is a single-submit
// action (there's nothing to edit piecemeal yet; the clinic doesn't exist
// until this form succeeds). name/email are required here, matching
// CreateClinicDto's own required fields; phone/address/website are
// .optional() at this object-assembly step, same "no asterisk, no
// required validation" treatment optional fields get everywhere else in
// this app.
export const createClinicSchema = z.object({
  name: clinicNameSchema,
  email: clinicEmailSchema,
  phone: clinicPhoneSchema.optional(),
  address: clinicAddressSchema.optional(),
  website: clinicWebsiteSchema.optional(),
})

export type CreateClinicFormValues = z.infer<typeof createClinicSchema>