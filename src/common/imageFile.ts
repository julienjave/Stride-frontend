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

// Builds the check for a picked file: an allowed type, and at most
// `maxSizeBytes`. A function rather than one fixed schema because the size
// limit depends on what happens to the file next:
// - uploaded AS PICKED (clinic logos, exercise photos): the backend's own
//   5MB limit — see imageFileSchema below;
// - cropped first (avatars): what's uploaded is the small cropped JPEG, so
//   the original can be bigger — see avatarSourceFileSchema in
//   users/avatarCrop.ts.
//
// z.instanceof(File) checks the value really is a browser File; each
// .refine() adds one custom check with the message shown if it fails.
export function makeImageFileSchema(maxSizeBytes: number) {
  // Written as a whole number of MB: 5 * 1024 * 1024 → "5MB".
  const maxSizeMb = maxSizeBytes / (1024 * 1024)
  return z
    .instanceof(File)
    .refine((file) => ALLOWED_IMAGE_MIME_TYPES.includes(file.type), {
      message: 'Only JPEG, PNG, and WebP images are allowed',
    })
    .refine((file) => file.size <= maxSizeBytes, {
      message: `Image must be ${maxSizeMb}MB or smaller`,
    })
}

// Checks a picked file BEFORE uploading it as it is, so an obviously wrong
// file (a PDF, a 20MB photo) is refused instantly with a clear message,
// rather than after a full upload that the backend then rejects.
export const imageFileSchema = makeImageFileSchema(MAX_IMAGE_FILE_SIZE_BYTES)