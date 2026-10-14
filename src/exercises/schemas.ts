import { z } from 'zod'
import { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_FILE_SIZE_BYTES } from '@/common/imageFile'
import { EXERCISE_LIST_RULES, EXERCISE_NAME_MAX_LENGTH } from './descriptionRules'

// useFieldArray (React Hook Form) requires each array entry to be an
// OBJECT with a stable identity, not a bare string — RHF generates its
// own internal `id` per row for exactly this reason, and that mechanism
// only works on objects. So this form's INTERNAL shape wraps every
// muscle/equipment/instruction as { value: string }; api.ts's
// createExercise() flattens this back to a plain string[] before the
// request goes out, since the backend has no idea RHF needs this and
// just wants an ordinary array of strings.
//
// `.trim()` first (step D-3): zod's trim is a TRANSFORM — the value is
// checked AND submitted without the spaces around it — so "   " is empty
// here, as the backend says since D-1 ("can't be blank"), and " traps " is
// sent as "traps".
function stringListItemSchema(maxLength: number) {
  return z.object({
    value: z
      .string()
      .trim()
      .min(1, 'This field cannot be empty')
      .max(maxLength, `Must be ${maxLength} characters or fewer`),
  })
}

// Mirrors CreateExerciseDto's validators exactly (name/array size/string
// length limits) — same reasoning as every other frontend schema in this
// codebase (auth/schemas.ts, common/address/schemas.ts): the backend is
// the actual authority on what's valid, and this schema exists to give
// immediate, inline feedback for the same rules, not to invent its own.
// The numbers come from descriptionRules.ts — the one copy the exercise
// pages read too (the step limit used to be 500 here, 1,000 since D-1).
const { primaryMuscles, secondaryMuscles, equipment, instructions } =
  EXERCISE_LIST_RULES

export const createExerciseSchema = z.object({
  // Trimmed before the checks (a transform: the trimmed name is what's
  // sent) — "   " used to pass this form, and the backend now refuses it.
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(
      EXERCISE_NAME_MAX_LENGTH,
      `Name must be ${EXERCISE_NAME_MAX_LENGTH} characters or fewer`,
    ),

  primaryMuscles: z
    .array(stringListItemSchema(primaryMuscles.itemMaxLength))
    .min(1, 'At least one primary muscle is required')
    .max(primaryMuscles.maxCount, `No more than ${primaryMuscles.maxCount} primary muscles`),

  // No .min(1) here — secondaryMuscles is genuinely optional on the
  // backend (CreateExerciseDto's field itself is @IsOptional()), so an
  // empty array is a perfectly valid submission, not something to block.
  secondaryMuscles: z
    .array(stringListItemSchema(secondaryMuscles.itemMaxLength))
    .max(secondaryMuscles.maxCount, `No more than ${secondaryMuscles.maxCount} secondary muscles`),

  equipment: z
    .array(stringListItemSchema(equipment.itemMaxLength))
    .max(equipment.maxCount, `No more than ${equipment.maxCount} equipment items`),

  instructions: z
    .array(stringListItemSchema(instructions.itemMaxLength))
    .min(1, 'At least one instruction step is required')
    .max(instructions.maxCount, `No more than ${instructions.maxCount} steps`),
})

export type CreateExerciseFormValues = z.infer<typeof createExerciseSchema>

// --- IMAGE UPLOAD VALIDATION ---------------------------------------------

// The accepted types and the 5MB limit come from the ONE shared copy of
// the backend's image-upload rule, src/common/imageFile.ts (also used by
// clinic logos and avatars). This schema is its own, rather than
// imageFileSchema itself, only for its wording: photos are picked
// several at a time here, so the size message says "Each image…".

// Matches the backend's FilesInterceptor("files", 5, ...) cap exactly
// (exercises.controller.ts) — enforced here too so a rejection is
// immediate and clear, not a generic 400 only discovered after a real
// request round-trip.
export const MAX_IMAGES_PER_UPLOAD = 5

export const exerciseImageFileSchema = z
  .instanceof(File)
  .refine((file) => ALLOWED_IMAGE_MIME_TYPES.includes(file.type), {
    message: 'Only JPEG, PNG, and WebP images are allowed',
  })
  .refine((file) => file.size <= MAX_IMAGE_FILE_SIZE_BYTES, {
    message: 'Each image must be 5MB or smaller',
  })

// Validates a whole batch of files at once (a drop or a multi-select can
// bring in several), rather than exposing just the single-file schema
// above and making every caller loop over it by hand. Returns the first
// problem found, or null if every file is fine — a single string is
// enough here since ONE upload action either fully succeeds or shows ONE
// clear reason it didn't, rather than a per-file error list the person
// would have to cross-reference against filenames themselves.
export function validateExerciseImageFiles(files: File[]): string | null {
  if (files.length > MAX_IMAGES_PER_UPLOAD) {
    return `You can upload up to ${MAX_IMAGES_PER_UPLOAD} images at a time`
  }
  for (const file of files) {
    const result = exerciseImageFileSchema.safeParse(file)
    if (!result.success) {
      return result.error.issues[0]?.message ?? 'Invalid file'
    }
  }
  return null
}

// --- INLINE ARRAY-FIELD EDITING (exercise detail page) -------------------

// A single, parameterized validator for all four array fields
// (primaryMuscles/secondaryMuscles/equipment/instructions) on the detail
// page's inline edit — rather than four near-identical zod schemas.
// Deliberately separate from createExerciseSchema's array fields above:
// those are wrapped as { value: string }[] specifically for
// useFieldArray's benefit (see that schema's own comment), while inline
// editing on the detail page uses plain string[] state instead — there's
// no multi-field form to coordinate here, just one field's own draft
// array, so plain useState is simpler than spinning up a whole separate
// React Hook Form instance for a single field. The actual per-field
// limits (100 vs 1,000 chars, 20 vs 50 entries — EXERCISE_LIST_RULES)
// still mirror CreateExerciseDto/UpdateExerciseDto exactly — only the
// shape of how they're checked differs from the create form.
export function validateStringListField(
  values: string[],
  options: {
    itemMaxLength: number
    minCount?: number
    maxCount: number
    itemLabel: string
  },
): string | null {
  if (options.minCount && values.length < options.minCount) {
    return `At least one ${options.itemLabel} is required`
  }
  if (values.length > options.maxCount) {
    return `No more than ${options.maxCount} ${options.itemLabel}s allowed`
  }
  for (const value of values) {
    if (value.trim().length === 0) {
      return 'This field cannot be empty'
    }
    if (value.length > options.itemMaxLength) {
      return `Must be ${options.itemMaxLength} characters or fewer`
    }
  }
  return null
}