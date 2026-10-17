import { describe, it, expect } from 'vitest'
import {
  PROGRAM_EXERCISE_PHOTO_LIMIT,
  libraryCopyProblem,
  noPhotosText,
  photoCountText,
  photoRoom,
  photoSourceText,
  uploadProblem,
} from './programPhotos'

// The rules of a program exercise's own photos (2026-10-17). The backend
// decides; these let the screens say it first, in the same terms.

const png = (name: string, size = 1000) =>
  new File([new Uint8Array(size)], name, { type: 'image/png' })
const files = (count: number) => Array.from({ length: count }, (_, i) => png(`p${i}.png`))

describe('the limit and the room left', () => {
  it("is the backend's 10", () => {
    expect(PROGRAM_EXERCISE_PHOTO_LIMIT).toBe(10)
  })

  it.each([
    [0, 10],
    [7, 3],
    [10, 0],
    // More than the database allows can't happen; the screen still never
    // says a negative number.
    [12, 0],
  ])('%i own photos leave room for %i', (count, room) => {
    expect(photoRoom(count)).toBe(room)
  })

  it('counts them out of 10', () => {
    expect(photoCountText(3)).toBe('3 of 10 photos')
  })
})

describe('uploadProblem', () => {
  it('accepts files that fit', () => {
    expect(uploadProblem(files(3), 7)).toBeNull()
    expect(uploadProblem(files(1), 9)).toBeNull()
  })

  // The library page's own rules come first, word for word.
  it("applies the library's file rules first", () => {
    expect(uploadProblem(files(6), 0)).toBe('You can upload up to 5 images at a time')
    expect(uploadProblem([new File(['x'], 'a.gif', { type: 'image/gif' })], 0)).toBe(
      'Only JPEG, PNG, and WebP images are allowed',
    )
  })

  it('refuses files that would go past 10, saying how many fit', () => {
    expect(uploadProblem(files(4), 7)).toBe(
      "There's room for 3 more photos (10 at most): choose fewer.",
    )
    expect(uploadProblem(files(2), 9)).toBe(
      "There's room for 1 more photo (10 at most): choose fewer.",
    )
  })

  it('says when there is no room at all', () => {
    expect(uploadProblem(files(1), 10)).toBe(
      'This exercise already has 10 photos: remove one to add another.',
    )
  })
})

describe('libraryCopyProblem', () => {
  it('accepts a copy that fits, exactly to 10 included', () => {
    expect(libraryCopyProblem(2, 0)).toBeNull()
    expect(libraryCopyProblem(2, 8)).toBeNull()
  })

  it('says the library has none', () => {
    expect(libraryCopyProblem(0, 3)).toBe('This exercise has no photos in the library.')
  })

  it('says how many fit when the copy would go past 10', () => {
    expect(libraryCopyProblem(3, 8)).toBe(
      "The library has 3 photos, but there's room for 2 more photos (10 at most).",
    )
    expect(libraryCopyProblem(2, 9)).toBe(
      "The library has 2 photos, but there's room for 1 more photo (10 at most).",
    )
  })

  it('says when there is no room at all', () => {
    expect(libraryCopyProblem(2, 10)).toBe(
      "This exercise already has 10 photos: remove some to copy the library's.",
    )
  })
})

describe('the wording of the source', () => {
  it('library photos', () => {
    // The own photos don't matter while the library's are shown.
    for (const own of [0, 3]) {
      expect(photoSourceText(true, own)).toBe(
        'These photos come from the exercise in the library, so a change there shows here too.',
      )
    }
    expect(noPhotosText(true)).toBe('This exercise has no photos in the library.')
  })

  it("this patient's photos, some", () => {
    expect(photoSourceText(false, 2)).toBe(
      "These are this patient's own photos: a change in the library doesn't reach them.",
    )
  })

  // Never worded like "the library has none": the patient sees nothing
  // because of a choice.
  it("this patient's photos, none yet", () => {
    expect(photoSourceText(false, 0)).toBe(
      "The patient sees no photos: this patient's own photos are chosen, and there are none yet.",
    )
    expect(noPhotosText(false)).toBe('No photos for this patient yet.')
  })
})