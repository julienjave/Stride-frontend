import { z } from 'zod'
import { TITLE_MAX_LENGTH } from '@/common/titleLimit'

// Mirrors the description's @MaxLength(TEMPLATE_DESCRIPTION_MAX_LENGTH) in
// CreateTemplateDto (the title's limit is shared with programs — see
// common/titleLimit.ts). Named and exported (rather than typed as literals
// below) because the inline title/description editors on
// TemplateDetailPage enforce the SAME limits outside of this Zod schema —
// one constant each means the creation form and the editors can never
// quietly disagree.
export const TEMPLATE_DESCRIPTION_MAX_LENGTH = 2000

// Mirrors CreateTemplateDto exactly (programs/dto/create-template.dto.ts)
// — same reasoning as every other frontend schema in this codebase: the
// backend is the actual authority on what's valid, this just gives
// immediate inline feedback for the same rules.
export const createTemplateSchema = z.object({
  // trim() FIRST: it's a transform, so "   " becomes "" before min(1) looks
  // at it (without it, three spaces were "a title" here and stored as one —
  // since 2026-10-14 the backend refuses them, so the form must too, or the
  // practitioner meets the server's 400 instead of the field's message).
  // zodResolver hands onSubmit the PARSED values, so the trimmed title is
  // also what's sent — the same as the template page's inline rename, which
  // trims before sending.
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(TITLE_MAX_LENGTH, `Title must be ${TITLE_MAX_LENGTH} characters or fewer`),
  description: z
    .string()
    .max(
      TEMPLATE_DESCRIPTION_MAX_LENGTH,
      `Description must be ${TEMPLATE_DESCRIPTION_MAX_LENGTH} characters or fewer`,
    )
    .optional(),
})

export type CreateTemplateFormValues = z.infer<typeof createTemplateSchema>

// --- ADD EXERCISE TO TEMPLATE ---------------------------------------------

// The first genuinely numeric form field in this app — worth a note on
// why this isn't just z.number().optional(). React Hook Form's
// `valueAsNumber: true` option (the standard way to bind a number
// input) reads the DOM's own `input.valueAsNumber`, which is NaN for an
// EMPTY input, not undefined. Without handling that, leaving an
// optional field blank would submit NaN, which then fails `.int()`/
// `.number()` validation — a false error on a field the person
// correctly left empty. This preprocessing step treats NaN the same as
// "not provided," matching what the person actually did.
function optionalPositiveInt(message: string) {
  return z.preprocess(
    (val) => (typeof val === 'number' && Number.isNaN(val) ? undefined : val),
    z.number().int(message).min(1, message).optional(),
  )
}

export const addTemplateExerciseSchema = z
  .object({
    sets: optionalPositiveInt('Sets must be a positive whole number'),
    reps: optionalPositiveInt('Reps must be a positive whole number'),
    durationInSeconds: optionalPositiveInt(
      'Duration must be a positive whole number of seconds',
    ),
    // Same NaN-from-empty-input handling as the integer fields above,
    // but not restricted to whole numbers — real plate increments (2.5kg,
    // 1.25kg) are common, matching the backend's own reasoning
    // (programs.schema.ts's weight column comment).
    weight: z.preprocess(
      (val) => (typeof val === 'number' && Number.isNaN(val) ? undefined : val),
      z
        .number()
        .min(0, 'Weight cannot be negative')
        .refine((val) => {
          const decimals = val.toString().split('.')[1]
          return !decimals || decimals.length <= 2
        }, 'Weight can have at most 2 decimal places')
        .optional(),
    ),
    weightUnit: z.enum(['kg', 'lbs']).optional(),
  })
  // The backend's hasStartedWeight rule: weight and unit together, or
  // neither — a weight with no unit is ambiguous, a unit with no weight is
  // meaningless clutter. Two halves, handled differently here:
  //
  // 1. A weight with no unit is an ERROR. The form pre-selects the user's
  //    preferred unit, so this can't normally happen — kept anyway, so
  //    the schema alone still guarantees the rule, whatever form uses it.
  .superRefine((data, ctx) => {
    if (data.weight !== undefined && data.weightUnit === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select a unit for the weight',
        path: ['weightUnit'],
      })
    }
  })
  // 2. A unit with no weight is NOT an error: the unit is simply dropped.
  //    The unit toggle always has one unit selected (it's pre-selected
  //    from the user's preference, and a toggle can't be "unselected"),
  //    so "a unit but no weight" is what every exercise WITHOUT a weight
  //    looks like in this form. Reporting it as an error would block
  //    adding any weightless exercise; the only sensible reading is
  //    "no weight".
  //
  //    .transform() runs after validation and changes the OUTPUT only —
  //    what handleSubmit receives — never what the form fields show.
  .transform((data) =>
    data.weight === undefined ? { ...data, weightUnit: undefined } : data,
  )

export type AddTemplateExerciseFormValues = z.infer<
  typeof addTemplateExerciseSchema
>