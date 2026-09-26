import { describe, it, expect } from 'vitest'
import { MAX_IMAGES_PER_UPLOAD, validateExerciseImageFiles } from './schemas'

// validateExerciseImageFiles() had no tests of its own: the photos page
// tests exercise uploads, but never a wrong type or an oversized file.
// Added when its type list and size limit moved to the shared
// src/common/imageFile.ts, so a change there can't silently change this
// page's behaviour.

function makeFile(name: string, type: string, sizeBytes: number) {
  return new File([new Uint8Array(sizeBytes)], name, { type })
}

const goodFile = () => makeFile('photo.png', 'image/png', 1000)

describe('validateExerciseImageFiles', () => {
  it('accepts JPEG, PNG and WebP files within the limits', () => {
    expect(
      validateExerciseImageFiles([
        makeFile('a.jpg', 'image/jpeg', 1000),
        makeFile('b.png', 'image/png', 1000),
        makeFile('c.webp', 'image/webp', 1000),
      ]),
    ).toBeNull()
  })

  it('refuses any other type', () => {
    expect(validateExerciseImageFiles([goodFile(), makeFile('cv.pdf', 'application/pdf', 1000)])).toBe(
      'Only JPEG, PNG, and WebP images are allowed',
    )
  })

  // Exactly at the limit is fine; one byte over is not — so the test pins
  // the real boundary (5MB), not just "some big file is refused".
  it('accepts a file of exactly 5MB and refuses one byte more, per file', () => {
    const fiveMb = 5 * 1024 * 1024
    expect(validateExerciseImageFiles([makeFile('ok.png', 'image/png', fiveMb)])).toBeNull()
    expect(validateExerciseImageFiles([makeFile('big.png', 'image/png', fiveMb + 1)])).toBe(
      'Each image must be 5MB or smaller',
    )
  })

  it(`refuses more than ${MAX_IMAGES_PER_UPLOAD} files at once`, () => {
    const files = Array.from({ length: MAX_IMAGES_PER_UPLOAD + 1 }, goodFile)
    expect(validateExerciseImageFiles(files)).toBe(
      `You can upload up to ${MAX_IMAGES_PER_UPLOAD} images at a time`,
    )
    expect(validateExerciseImageFiles(files.slice(1))).toBeNull()
  })
})