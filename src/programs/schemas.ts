import { z } from 'zod'

// Mirrors the backend's TEMPLATE_TITLE_MAX_LENGTH and the description's
// @MaxLength(2000) in CreateTemplateDto. Named and exported (rather than
// typed as literals below) because the inline title/description editors
// on TemplateDetailPage enforce the SAME limits outside of this Zod
// schema — one constant each means the creation form and the editors
// can never quietly disagree.
export const TEMPLATE_TITLE_MAX_LENGTH = 200
export const TEMPLATE_DESCRIPTION_MAX_LENGTH = 2000

// Mirrors CreateTemplateDto exactly (programs/dto/create-template.dto.ts)
// — same reasoning as every other frontend schema in this codebase: the
// backend is the actual authority on what's valid, this just gives
// immediate inline feedback for the same rules.
export const createTemplateSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(
      TEMPLATE_TITLE_MAX_LENGTH,
      `Title must be ${TEMPLATE_TITLE_MAX_LENGTH} characters or fewer`,
    ),
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
  // Mirrors the backend's hasStartedWeight rule exactly (both fields
  // required together, or neither) — same reasoning as that shared
  // validator's own comment: a weight with no unit is ambiguous, a unit
  // with no weight is meaningless clutter.
  .superRefine((data, ctx) => {
    const hasWeight = data.weight !== undefined
    const hasUnit = data.weightUnit !== undefined
    if (hasWeight && !hasUnit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select a unit for the weight',
        path: ['weightUnit'],
      })
    }
    if (hasUnit && !hasWeight) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter a weight for the selected unit',
        path: ['weight'],
      })
    }
  })

export type AddTemplateExerciseFormValues = z.infer<
  typeof addTemplateExerciseSchema
>