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

import { useRef, useState } from 'react'
import { useParams, Link } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { failureText } from '@/api/apiErrors'
import { RecordLoadFailed, RecordNotFound } from '@/common/RecordNotFound'
import { useRetryFocus } from '@/common/useRetryFocus'
import { useExercise } from './useExercise'
import {
  exerciseQueryKey,
  uploadExerciseImages,
  reorderExerciseImages,
  removeExerciseImage,
} from './api'
import { validateExerciseImageFiles } from './schemas'
import { IMAGE_FILE_ACCEPT } from '@/common/imageFile'
import { SortableExerciseImage } from './SortableExerciseImage'
import { computeReorderedKeys } from './exerciseImageReorder'
import type { ExerciseDetail } from './types'
import { Loading } from '@/common/Loading'

export function ExercisePhotosPage() {
  const { id } = useParams<{ id: string }>()
  const exerciseId = Number(id)

  // Same split-component convention as ClinicEditPage: validate the URL
  // param HERE, before any hook that needs a real id ever runs, rather
  // than calling useExercise(NaN) and letting it fail confusingly later.
  // Splitting into a separate inner component keeps that guard clause
  // and the actual fetch-and-render logic as two distinct concerns.
  // (An id that isn't a number can't be an exercise: the 404's page.)
  if (!id || Number.isNaN(exerciseId)) {
    return <RecordNotFound noun="exercise" links={WAYS_OUT} />
  }

  return <ExercisePhotosView exerciseId={exerciseId} />
}

// Where to go when this page can't show its exercise (RecordNotFound).
const WAYS_OUT: [{ to: string; label: string }] = [
  { to: '/practitioner/library', label: 'Exercise Library' },
]

function ExercisePhotosView({ exerciseId }: { exerciseId: number }) {
  const queryClient = useQueryClient()
  const exerciseQuery = useExercise(exerciseId)
  const { data: exercise, isLoading } = exerciseQuery
  // After a "Try again" that worked, focus goes to the page's heading.
  const heading = useRetryFocus<HTMLHeadingElement>('this exercise', exerciseQuery.isSuccess)

  const [validationError, setValidationError] = useState<string | null>(null)
  const [isDraggingFileOver, setIsDraggingFileOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Every mutation below writes its response straight into the cache via
  // setQueryData, the same "the response IS the full authoritative new
  // state" pattern ClinicLogoUpload already uses — no extra re-fetch
  // needed, since withImages' response already reflects exactly what
  // changed.
  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => uploadExerciseImages(exerciseId, files),
    onSuccess: (updated) => {
      queryClient.setQueryData(exerciseQueryKey(exerciseId), updated)
    },
  })

  const removeMutation = useMutation({
    mutationFn: (objectKey: string) =>
      removeExerciseImage(exerciseId, objectKey),
    onSuccess: (updated) => {
      queryClient.setQueryData(exerciseQueryKey(exerciseId), updated)
    },
  })

  // The first optimistic update in this codebase, so worth spelling out
  // the shape: onMutate fires IMMEDIATELY, before the request even goes
  // out, reordering the cache right away so dragging feels instant
  // rather than snapping back to the old order until the server responds.
  // It returns the PREVIOUS cached value as "context" — if the request
  // later fails, onError uses that exact context to restore the gallery
  // to what it looked like before the drag, rather than leaving it
  // showing an order the server never actually confirmed. onSuccess
  // still overwrites with the server's real response afterward, so any
  // subtle difference (there shouldn't be one, but real state always
  // wins over an optimistic guess) gets corrected.
  const reorderMutation = useMutation({
    mutationFn: (order: string[]) =>
      reorderExerciseImages(exerciseId, order),
    onMutate: async (order) => {
      await queryClient.cancelQueries({
        queryKey: exerciseQueryKey(exerciseId),
      })
      const previous = queryClient.getQueryData<ExerciseDetail>(
        exerciseQueryKey(exerciseId),
      )
      if (previous) {
        const byKey = new Map(
          previous.images.map((image) => [image.objectKey, image]),
        )
        const reordered = order
          .map((key) => byKey.get(key))
          .filter((image): image is ExerciseDetail['images'][number] =>
            image != null,
          )
        queryClient.setQueryData(exerciseQueryKey(exerciseId), {
          ...previous,
          images: reordered,
        })
      }
      return { previous }
    },
    onError: (_error, _order, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          exerciseQueryKey(exerciseId),
          context.previous,
        )
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(exerciseQueryKey(exerciseId), updated)
    },
  })

  // PointerSensor handles mouse/touch drags; KeyboardSensor (with
  // dnd-kit's own sortableKeyboardCoordinates) lets someone reorder
  // using arrow keys after tabbing to a drag handle — drag-and-drop
  // reordering has no keyboard equivalent otherwise, which would leave
  // this feature entirely unusable without a mouse.
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleFiles(files: File[]) {
    if (files.length === 0) return
    const error = validateExerciseImageFiles(files)
    if (error) {
      setValidationError(error)
      return
    }
    setValidationError(null)
    uploadMutation.mutate(files)
  }

  function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    // Reset immediately, same reasoning as ClinicLogoUpload's own
    // handler — otherwise re-selecting the exact same file(s) later
    // wouldn't even fire this handler a second time.
    event.target.value = ''
    handleFiles(files)
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDraggingFileOver(false)
    handleFiles(Array.from(event.dataTransfer.files))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || !exercise) return
    const newOrder = computeReorderedKeys(
      exercise.images,
      String(active.id),
      String(over.id),
    )
    if (newOrder) {
      reorderMutation.mutate(newOrder)
    }
  }

  if (isLoading) {
    return <Loading className="mx-auto mt-12 max-w-2xl px-4" />
  }

  // A 404: "Exercise not found"; anything else: the load error, its reason
  // and "Try again".
  if (exerciseQuery.isError || !exercise) {
    return (
      <RecordLoadFailed queries={[exerciseQuery]} what="this exercise" noun="exercise" links={WAYS_OUT} />
    )
  }

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-6 px-4">
      <div>
        <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
          Manage Photos
        </h1>
        <p className="text-sm text-muted-foreground">{exercise.name}</p>
      </div>

      {/* Drop zone — visually SEPARATE from the gallery below, so
          dragging an EXISTING photo to reorder it and dragging a NEW
          file in from the desktop are never ambiguous about which
          action is happening (see the design discussion). */}
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setIsDraggingFileOver(true)
        }}
        onDragLeave={() => setIsDraggingFileOver(false)}
        onDrop={handleDrop}
        className={
          isDraggingFileOver
            ? 'rounded-lg border-2 border-dashed border-ring bg-muted p-6 text-center'
            : 'rounded-lg border-2 border-dashed border-input p-6 text-center'
        }
      >
        <p className="text-sm text-muted-foreground">Drag photos here, or</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          disabled={uploadMutation.isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploadMutation.isPending ? 'Uploading…' : 'Browse files'}
        </Button>
        {/* Hidden, same pattern as ClinicLogoUpload's own file input —
            reachable only via the visible Button above, not by tabbing
            to it directly. multiple, unlike the single-logo case,
            since up to 5 files can be picked at once here. */}
        <Input
          ref={fileInputRef}
          type="file"
          accept={IMAGE_FILE_ACCEPT}
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />
      </div>

      {validationError && (
        <p className="text-sm text-destructive">{validationError}</p>
      )}
      {uploadMutation.isError && (
        <p className="text-sm text-destructive">
          {failureText(uploadMutation.error)}
        </p>
      )}

      {/* Gallery — reorderable, each tile individually removable.
          Upload/reorder/delete are all immediate, matching the design
          discussion: nothing here is staged behind a save action. */}
      {exercise.images.length === 0 ? (
        <p className="text-sm text-muted-foreground">No photos yet.</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={exercise.images.map((image) => image.objectKey)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {exercise.images.map((image, index) => (
                <SortableExerciseImage
                  key={image.objectKey}
                  image={image}
                  alt={`${exercise.name} photo ${index + 1}`}
                  onDelete={() => removeMutation.mutate(image.objectKey)}
                  deleting={
                    removeMutation.isPending &&
                    removeMutation.variables === image.objectKey
                  }
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {removeMutation.isError && (
        <p className="text-sm text-destructive">
          Couldn't remove that photo. Try again.
        </p>
      )}

      {/* Pure navigation — nothing to submit here. Every actual change
          (upload, reorder, delete) already took effect immediately as
          it happened, per the design discussion's "no staged actions"
          decision. */}
      <Button asChild>
        <Link to={`/practitioner/library/${exerciseId}`}>Done</Link>
      </Button>
    </div>
  )
}