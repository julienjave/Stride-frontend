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

import type { Area } from 'react-easy-crop'
import {
  AVATAR_FILE_NAME,
  AVATAR_JPEG_QUALITY,
  AVATAR_OUTPUT_TYPE,
  planAvatarCrop,
} from './avatarCrop'

// The browser-only half of the crop: decoding the photo and drawing it on
// a <canvas>. Kept in its own small file, apart from the maths in
// avatarCrop.ts, for testing: jsdom has no canvas, so component tests
// replace this whole module with a fake (vi.mock('./cropImage')), while
// the maths stays real and has its own tests. This file is checked in a
// real browser instead (the manual checklist).

// Loads an image URL (here always a local "blob:" URL) into an <img>
// element that isn't on the page. Wrapped in a Promise so callers can
// `await` it: the browser decodes images in the background and reports
// back through the load/error events.
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    // e.g. a file that claims to be a JPEG but isn't one, or a format this
    // browser can't decode.
    image.onerror = () => reject(new Error("Couldn't read the image"))
    image.src = url
  })
}

// Turns "this photo + this square of it" into a small JPEG File, ready for
// the existing uploadAvatar(). Returning a File (not a bare Blob) means the
// upload code doesn't change at all: FormData sends a File's name and type
// along with its bytes, and the backend reads the type.
export async function cropToAvatarFile(imageUrl: string, area: Area): Promise<File> {
  const image = await loadImage(imageUrl)
  const plan = planAvatarCrop(area)

  // A canvas created in memory, never added to the page — just a pixel
  // buffer to draw on.
  const canvas = document.createElement('canvas')
  canvas.width = plan.outputSize
  canvas.height = plan.outputSize

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas is not available')
  }

  // JPEG has no transparency: any transparent pixel of a PNG/WebP would be
  // encoded as BLACK. Painting the canvas white first means a transparent
  // background comes out white instead.
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, plan.outputSize, plan.outputSize)

  // Ask for the smoother (slower) scaling algorithm: shrinking a 3000px
  // square to 512 with the default can look jagged in some browsers.
  context.imageSmoothingQuality = 'high'

  // The 9-argument drawImage: copy the source square
  // (sourceX, sourceY, sourceSize × sourceSize) of the photo and draw it
  // scaled into the whole canvas (0, 0, outputSize × outputSize).
  //
  // Phone photos store their rotation separately (EXIF "orientation").
  // Modern browsers apply it when decoding an <img>, both for what
  // react-easy-crop shows and for drawImage here — so the coordinates the
  // library gives us and the pixels we copy agree. Worth checking with a
  // real portrait phone photo (manual checklist).
  context.drawImage(
    image,
    plan.sourceX,
    plan.sourceY,
    plan.sourceSize,
    plan.sourceSize,
    0,
    0,
    plan.outputSize,
    plan.outputSize,
  )

  // toBlob() encodes the canvas as an image file. It's callback-based (it
  // works in the background), so it's wrapped in a Promise like loadImage.
  // It hands back null if encoding fails.
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, AVATAR_OUTPUT_TYPE, AVATAR_JPEG_QUALITY),
  )
  if (!blob) {
    throw new Error("Couldn't encode the image")
  }

  return new File([blob], AVATAR_FILE_NAME, { type: AVATAR_OUTPUT_TYPE })
}