import type { Area } from 'react-easy-crop'
import { makeImageFileSchema } from '@/common/imageFile'

// What a cropped avatar becomes before it's uploaded. Decided 2026-09-27
// (decisions §4, "Avatar crop"):
// - a square, at most 512×512 — avatars display at 64px at most today, so
//   512 leaves room for high-density screens and bigger future layouts;
// - JPEG at quality 0.9 — a photo compresses far better as JPEG than PNG,
//   and an avatar shown inside a circle needs no transparency. A typical
//   phone photo (several MB) ends up around 40–80 KB.
export const AVATAR_OUTPUT_SIZE = 512
export const AVATAR_OUTPUT_TYPE = 'image/jpeg'
export const AVATAR_JPEG_QUALITY = 0.9
// The backend names the stored file from the MIME type, not from this
// name, but a File needs one — and ".jpg" matches the type above.
export const AVATAR_FILE_NAME = 'avatar.jpg'

// The limit on the ORIGINAL photo someone picks — not on what's uploaded.
//
// What's uploaded is the cropped JPEG: at most 512×512, a few hundred KB at
// the very worst, far under the backend's 5MB. The backend still checks that
// 5MB on every upload (the real safeguard: the API can be called without
// this page), so there's nothing useful for the frontend to check on the
// cropped result.
//
// Why the original still gets a limit, just a bigger one: to crop it, the
// browser decodes the WHOLE photo into memory, at 4 bytes per pixel whatever
// the file size — a 48-megapixel photo takes about 190MB. On a phone that
// can freeze or crash the tab. The file size is a rough stand-in for "how
// big will this be once decoded", and refusing early gives a clear message
// instead of a hang. 20MB accepts ordinary phone photos (typically 2–15MB)
// that the old 5MB limit turned away.
export const MAX_AVATAR_SOURCE_FILE_SIZE_BYTES = 20 * 1024 * 1024

// The check AvatarUpload runs on a picked photo before opening the crop
// dialog: same allowed types as every image upload, the larger limit above.
export const avatarSourceFileSchema = makeImageFileSchema(MAX_AVATAR_SOURCE_FILE_SIZE_BYTES)

// Everything the canvas step needs, in the order drawImage() takes it:
// which square of the ORIGINAL photo to copy (sourceX/Y/Size, in the
// photo's own pixels), and how big the square it's drawn into is.
export interface AvatarCropPlan {
  sourceX: number
  sourceY: number
  sourceSize: number
  outputSize: number
}

// The crop maths, kept as a PURE function: numbers in, numbers out, no
// canvas, no DOM. That's what makes it testable — jsdom (the fake browser
// the tests run in) has no canvas at all, so the drawing step can't be
// unit-tested, but the decisions about WHAT to draw can.
//
// `area` is react-easy-crop's `croppedAreaPixels`: the part of the photo
// inside the circle, measured in the photo's real pixels (not screen
// pixels), already rounded and kept inside the photo by the library. So
// the zoom and drag are already "baked in" — at zoom 2 the area is half as
// wide as at zoom 1. What's left for us:
export function planAvatarCrop(
  area: Area,
  maxOutputSize: number = AVATAR_OUTPUT_SIZE,
): AvatarCropPlan {
  // 1. A true square. With aspect={1} the library's width and height are
  //    equal, but they're computed separately and each rounded — taking the
  //    smaller of the two guarantees we never read past the chosen area
  //    even if they ever differ by a pixel.
  const sourceSize = Math.min(area.width, area.height)

  // 2. Refuse an empty area rather than produce an empty canvas. A 0×0
  //    canvas makes toBlob() hand back null — failing here gives a clear
  //    error at the actual cause instead.
  if (sourceSize < 1) {
    throw new Error('The crop area is empty')
  }

  return {
    sourceX: area.x,
    sourceY: area.y,
    sourceSize,
    // 3. Shrink, never enlarge. A 3000px square is scaled down to 512; a
    //    300px square (a small original, or a big zoom) stays 300. Scaling
    //    300 up to 512 would add no detail — just a bigger file of the same
    //    blurry picture — and the browser enlarges it on screen anyway if a
    //    layout ever needs it.
    outputSize: Math.min(sourceSize, maxOutputSize),
  }
}