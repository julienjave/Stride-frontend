import { z } from 'zod'

// The one frontend copy of the backend's image-upload rule
// (image-upload.config.ts: JPEG/PNG/WebP, 5MB). Duplicated across the
// network boundary on purpose — the frontend and backend are separate
// projects with no shared code — so a change on one side needs the other
// updated by hand.
//
// Why it lives in common/: clinic logos, exercise photos and avatars all
// upload through the backend's same imageUploadOptions. The rule used to
// be copied into clinics/schemas.ts and exercises/schemas.ts; with avatars
// it would have been a third copy — the point where one shared definition
// pays for itself ("rule of three"). All three features now read it from
// here, so a change to the backend rule means one frontend edit.
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024

// For an <input type="file">'s `accept` attribute — built from the list
// above so the two can't disagree. `accept` only filters what the OS file
// picker offers first; it's advisory (most pickers have an "All files"
// option), which is why imageFileSchema below still checks.
export const IMAGE_FILE_ACCEPT = ALLOWED_IMAGE_MIME_TYPES.join(',')

// Checks a picked file BEFORE uploading it, so an obviously wrong file (a
// PDF, a 20MB photo) is refused instantly with a clear message, rather
// than after a full upload that the backend then rejects.
//
// z.instanceof(File) checks the value really is a browser File; each
// .refine() adds one custom check with the message shown if it fails.
export const imageFileSchema = z
  .instanceof(File)
  .refine((file) => ALLOWED_IMAGE_MIME_TYPES.includes(file.type), {
    message: 'Only JPEG, PNG, and WebP images are allowed',
  })
  .refine((file) => file.size <= MAX_IMAGE_FILE_SIZE_BYTES, {
    message: 'Image must be 5MB or smaller',
  })