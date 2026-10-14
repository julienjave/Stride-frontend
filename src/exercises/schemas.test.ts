import { describe, it, expect } from 'vitest'
import {
  MAX_IMAGES_PER_UPLOAD,
  createExerciseSchema,
  validateExerciseImageFiles,
} from './schemas'

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

// The New exercise form's rules (step D-3): the description's limits come
// from descriptionRules.ts, and what a person types is trimmed — "   " is no
// name (the backend refuses it since D-1), " traps " is sent as "traps".
describe('createExerciseSchema', () => {
  const valid = {
    name: 'Wall Slide',
    primaryMuscles: [{ value: 'shoulders' }],
    secondaryMuscles: [],
    equipment: [],
    instructions: [{ value: 'Slide up' }],
  }

  function messages(values: unknown) {
    const result = createExerciseSchema.safeParse(values)
    return result.success ? [] : result.error.issues.map((issue) => issue.message)
  }

  it('sends what was typed without the spaces around it', () => {
    const result = createExerciseSchema.parse({
      ...valid,
      name: '  Wall Slide ',
      equipment: [{ value: ' wall ' }],
    })
    expect(result.name).toBe('Wall Slide')
    expect(result.equipment).toStrictEqual([{ value: 'wall' }])
  })

  it.each([[''], ['   ']])('refuses a blank name (%j)', (name) => {
    expect(messages({ ...valid, name })).toStrictEqual(['Name is required'])
  })

  it('refuses a list item of spaces', () => {
    expect(messages({ ...valid, primaryMuscles: [{ value: '   ' }] })).toStrictEqual([
      'This field cannot be empty',
    ])
  })

  it('accepts a 1,000-character step and refuses 1,001', () => {
    expect(messages({ ...valid, instructions: [{ value: 'a'.repeat(1000) }] })).toStrictEqual([])
    expect(messages({ ...valid, instructions: [{ value: 'a'.repeat(1001) }] })).toStrictEqual([
      'Must be 1000 characters or fewer',
    ])
  })

  it('accepts a 200-character name and refuses 201', () => {
    expect(messages({ ...valid, name: 'a'.repeat(200) })).toStrictEqual([])
    expect(messages({ ...valid, name: 'a'.repeat(201) })).toStrictEqual([
      'Name must be 200 characters or fewer',
    ])
  })
})