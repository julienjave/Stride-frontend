import { z } from 'zod'

// useFieldArray (React Hook Form) requires each array entry to be an
// OBJECT with a stable identity, not a bare string — RHF generates its
// own internal `id` per row for exactly this reason, and that mechanism
// only works on objects. So this form's INTERNAL shape wraps every
// muscle/equipment/instruction as { value: string }; api.ts's
// createExercise() flattens this back to a plain string[] before the
// request goes out, since the backend has no idea RHF needs this and
// just wants an ordinary array of strings.
function stringListItemSchema(maxLength: number) {
  return z.object({
    value: z
      .string()
      .min(1, 'This field cannot be empty')
      .max(maxLength, `Must be ${maxLength} characters or fewer`),
  })
}

// Mirrors CreateExerciseDto's validators exactly (name/array size/string
// length limits) — same reasoning as every other frontend schema in this
// codebase (auth/schemas.ts, common/address/schemas.ts): the backend is
// the actual authority on what's valid, and this schema exists to give
// immediate, inline feedback for the same rules, not to invent its own.
export const createExerciseSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(200, 'Name must be 200 characters or fewer'),

  primaryMuscles: z
    .array(stringListItemSchema(100))
    .min(1, 'At least one primary muscle is required')
    .max(20, 'No more than 20 primary muscles'),

  // No .min(1) here — secondaryMuscles is genuinely optional on the
  // backend (CreateExerciseDto's field itself is @IsOptional()), so an
  // empty array is a perfectly valid submission, not something to block.
  secondaryMuscles: z
    .array(stringListItemSchema(100))
    .max(20, 'No more than 20 secondary muscles'),

  equipment: z
    .array(stringListItemSchema(100))
    .max(20, 'No more than 20 equipment items'),

  instructions: z
    .array(stringListItemSchema(500))
    .min(1, 'At least one instruction step is required')
    .max(50, 'No more than 50 steps'),
})

export type CreateExerciseFormValues = z.infer<typeof createExerciseSchema>

// --- IMAGE UPLOAD VALIDATION ---------------------------------------------

// Mirrors the backend's imageUploadOptions (common/config/image-upload.
// config.ts) exactly — same MIME types, same 5MB-per-file limit. Defined
// locally here rather than importing from clinics/schemas.ts (which has
// its own near-identical clinicLogoFileSchema/constants): same
// established convention as the User/CurrentUser type duplication
// elsewhere in this codebase — separate feature folders, a small,
// acknowledged duplication rather than a cross-cutting shared-file
// refactor for two constants.
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024

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