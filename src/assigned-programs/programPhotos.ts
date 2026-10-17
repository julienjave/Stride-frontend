import { validateExerciseImageFiles } from '@/exercises/schemas'

// The rules of a program exercise's OWN photos (program-specific photos,
// decided 2026-10-17) — pure functions, so each is tested on its own and the
// two screens (the exercise page's Photos section, the photo page) can't word
// the same fact two ways.
//
// The backend is the authority: it refuses more than 10 photos, with a
// message saying how many fit, and its CHECK does too. These rules only let
// the screen say it FIRST — before uploading files the server would refuse,
// or before offering a copy that can't fit — never more loosely than the
// backend.

// The backend's PROGRAM_EXERCISE_PHOTO_LIMIT (program-photos.ts) and its
// database CHECK. One number, written once on this side.
export const PROGRAM_EXERCISE_PHOTO_LIMIT = 10

// How many more own photos fit — never negative (the database can't hold
// more than 10, but a screen should never show "-1 more").
export function photoRoom(ownCount: number) {
  return Math.max(0, PROGRAM_EXERCISE_PHOTO_LIMIT - ownCount)
}

// "1 more photo", "3 more photos".
function morePhotos(count: number) {
  return count === 1 ? '1 more photo' : `${count} more photos`
}

// "3 of 10 photos" — shown on the photo page, so the limit is never a
// surprise.
export function photoCountText(ownCount: number) {
  return `${ownCount} of ${PROGRAM_EXERCISE_PHOTO_LIMIT} photos`
}

// What's wrong with uploading these files, or null. In this order:
//   1. the library page's own file rules (5 at a time, JPEG / PNG / WebP,
//      5 MB each — `validateExerciseImageFiles`, shared, so both pages say
//      the same thing);
//   2. the room left: none, or fewer than the files chosen. Nothing is
//      uploaded partially (the backend refuses the whole request too), so the
//      message says how many to choose.
export function uploadProblem(files: File[], ownCount: number): string | null {
  const fileProblem = validateExerciseImageFiles(files)
  if (fileProblem) return fileProblem
  const room = photoRoom(ownCount)
  if (room === 0) {
    return `This exercise already has ${PROGRAM_EXERCISE_PHOTO_LIMIT} photos: remove one to add another.`
  }
  if (files.length > room) {
    return `There's room for ${morePhotos(room)} (${PROGRAM_EXERCISE_PHOTO_LIMIT} at most): choose fewer.`
  }
  return null
}

// Why "Add the library's photos" can't be used right now, or null. The
// button stays on the page either way (decided: always offered), disabled
// with this reason beside it — a button that silently does nothing, or a
// request the server will refuse, would both be worse.
export function libraryCopyProblem(libraryCount: number, ownCount: number): string | null {
  if (libraryCount === 0) return 'This exercise has no photos in the library.'
  const room = photoRoom(ownCount)
  if (libraryCount > room) {
    return room === 0
      ? `This exercise already has ${PROGRAM_EXERCISE_PHOTO_LIMIT} photos: remove some to copy the library's.`
      : // Here the room is at least 1 and the library has MORE than that, so
        // at least 2 photos: always "photos".
        `The library has ${libraryCount} photos, but there's room for ${morePhotos(room)} (${PROGRAM_EXERCISE_PHOTO_LIMIT} at most).`
  }
  return null
}

// The sentence under the photos on the exercise page: where the photos the
// patient sees come from, and what that means. Three cases, because "no own
// photos yet" must not read like "no photos in the library".
export function photoSourceText(useLibraryImages: boolean, ownCount: number) {
  if (useLibraryImages) {
    return 'These photos come from the exercise in the library, so a change there shows here too.'
  }
  if (ownCount === 0) {
    return "The patient sees no photos: this patient's own photos are chosen, and there are none yet."
  }
  return "These are this patient's own photos: a change in the library doesn't reach them."
}

// What the carousel says when there is nothing to show, by source.
export function noPhotosText(useLibraryImages: boolean) {
  return useLibraryImages
    ? 'This exercise has no photos in the library.'
    : "No photos for this patient yet."
}