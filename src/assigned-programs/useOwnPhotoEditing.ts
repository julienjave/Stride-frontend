import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '@/api/client'
import {
  assignedProgramQueryKey,
  copyLibraryImagesToProgramExercise,
  removeProgramExerciseImage,
  reorderProgramExerciseImages,
  uploadProgramExerciseImages,
} from './api'
import type { AssignedProgramDetail } from './types'

// Every write of the photo page (program-specific photos, 2026-10-17): upload,
// copy the library's, reorder, remove. Each answers with the FULL program,
// written into the program's cache entry — the photo page, the exercise page
// and the program page all read it, so all three show the new photos.
//
// One message area for the page (`problem`), as the workout editor has: the
// next action clears it. "<What failed>. <the backend's reason for a 4xx, or
// 'Try again.'>" — a 4xx reason is written for people ("…this one has 8, so 2
// more can be added"); a 5xx or a network failure isn't.
//
// `isBusy`: while any write is on its way, the page disables every control
// that changes the photos — a second change built on a list about to be
// replaced could name photos that no longer exist.
export function useOwnPhotoEditing(programId: number, exerciseRowId: number) {
  const queryClient = useQueryClient()
  const key = assignedProgramQueryKey(programId)
  const [problem, setProblem] = useState<string | null>(null)

  function answered(updated: AssignedProgramDetail) {
    queryClient.setQueryData(key, updated)
  }
  function failed(what: string) {
    return (error: Error) => {
      setProblem(
        `${what} ${
          error instanceof ApiError && error.statusCode < 500
            ? error.messages.join(' ')
            : 'Try again.'
        }`,
      )
    }
  }

  const upload = useMutation({
    mutationFn: (files: File[]) => uploadProgramExerciseImages(programId, exerciseRowId, files),
    onMutate: () => setProblem(null),
    onSuccess: answered,
    onError: failed("Couldn't upload the photos."),
  })

  const copyLibrary = useMutation({
    mutationFn: () => copyLibraryImagesToProgramExercise(programId, exerciseRowId),
    onMutate: () => setProblem(null),
    onSuccess: answered,
    onError: failed("Couldn't copy the library's photos."),
  })

  const remove = useMutation({
    mutationFn: (objectKey: string) => removeProgramExerciseImage(programId, exerciseRowId, objectKey),
    onMutate: () => setProblem(null),
    onSuccess: answered,
    onError: failed("Couldn't remove the photo."),
  })

  // OPTIMISTIC, like the library page's reorder and every drag in the app: a
  // dropped photo stays where it was dropped while the request runs. Cancel a
  // re-read on its way (its older answer would land after the guess and undo
  // it), remember the program, write the guess — the own photos in the new
  // order, and `images` too when the own photos are the ones shown (it is the
  // same list, signed the same way) —, put the remembered program back on
  // failure, write the server's answer on success.
  const reorder = useMutation({
    mutationFn: (order: string[]) => reorderProgramExerciseImages(programId, exerciseRowId, order),
    onMutate: async (order) => {
      setProblem(null)
      await queryClient.cancelQueries({ queryKey: key, exact: true })
      const previous = queryClient.getQueryData<AssignedProgramDetail>(key)
      if (previous) {
        queryClient.setQueryData<AssignedProgramDetail>(key, {
          ...previous,
          exercises: previous.exercises.map((exercise) => {
            if (exercise.id !== exerciseRowId) return exercise
            const byKey = new Map(exercise.ownImages.map((image) => [image.objectKey, image]))
            const ownImages = order.flatMap((objectKey) => {
              const image = byKey.get(objectKey)
              return image ? [image] : []
            })
            return {
              ...exercise,
              ownImages,
              images: exercise.useLibraryImages
                ? exercise.images
                : ownImages.map(({ url }) => ({ url })),
            }
          }),
        })
      }
      return { previous }
    },
    onError: (error, _order, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
      failed("Couldn't reorder the photos.")(error)
    },
    onSuccess: answered,
  })

  return {
    upload,
    copyLibrary,
    reorder,
    remove,
    problem,
    // A problem found BEFORE any request (a file too big, no room): shown in
    // the same place, cleared the same way.
    setProblem,
    isBusy: upload.isPending || copyLibrary.isPending || reorder.isPending || remove.isPending,
  }
}