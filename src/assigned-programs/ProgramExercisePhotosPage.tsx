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
import { Link, useParams, useSearchParams } from 'react-router'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { IMAGE_FILE_ACCEPT } from '@/common/imageFile'
import { localPath } from '@/exercises/pickerReturnHref'
import { SortableExerciseImage } from '@/exercises/SortableExerciseImage'
import { computeReorderedKeys } from '@/exercises/exerciseImageReorder'
import { useExercise } from '@/exercises/useExercise'
import { ExercisePhotoCarousel } from '@/programs/ExercisePhotoCarousel'
import { ProgramLoadFailed, ProgramNotAvailable } from './ProgramNotAvailable'
import { DEACTIVATED_PHOTOS_TEXT } from './programLock'
import { useProgramLock } from './useProgramLock'
import { libraryCopyProblem, photoCountText, photoRoom, uploadProblem } from './programPhotos'
import { useAssignedProgram } from './useAssignedProgram'
import { useOwnPhotoEditing } from './useOwnPhotoEditing'
import type { AssignedProgramDetail, AssignedProgramExercise } from './types'
import { useRetryFocus } from '@/common/useRetryFocus'
import { Loading } from '@/common/Loading'

// A program exercise's OWN photos (program-specific photos, 2026-10-17):
// `/practitioner/programs/assigned/:id/exercises/:rowId/photos`, from the
// exercise page's "Manage this patient's photos". Upload, copy the library's,
// drag to reorder (the first is the cover), remove — the library photo page's
// shape (ExercisePhotosPage), and its pieces (`SortableExerciseImage`,
// `computeReorderedKeys`, the file rules), because the requests have the same
// shapes on purpose.
//
// What differs from the library's page, and why:
//   - it says whether the patient SEES these photos: adding them never
//     switches the choice (the exercise page's radios do), so a practitioner
//     preparing photos must be told they aren't shown yet;
//   - the limit (10) is shown and checked before a request — "3 of 10
//     photos", and why a file or the copy can't be added;
//   - "Add the library's photos (N)" — copies, not references (a colleague's
//     later change in the library can't reach them), always offered (decided:
//     asked twice, it copies twice), disabled with its reason when it can't
//     work;
//   - a removed photo's file is deleted for good — the page says so once,
//     rather than asking each time (the library's page doesn't ask either).
// Read-only on a closed program, as the rest of a closed program is.
export function ProgramExercisePhotosPage() {
  const { id, rowId } = useParams<{ id: string; rowId: string }>()
  const programId = Number(id)
  const exerciseRowId = Number(rowId)

  if (
    !Number.isInteger(programId) ||
    programId < 1 ||
    !Number.isInteger(exerciseRowId) ||
    exerciseRowId < 1
  ) {
    return <ProgramNotAvailable />
  }

  return <PhotosView programId={programId} exerciseRowId={exerciseRowId} />
}

function PhotosView({ programId, exerciseRowId }: { programId: number; exerciseRowId: number }) {
  const [searchParams] = useSearchParams()
  const exercisePath = `/practitioner/programs/assigned/${programId}/exercises/${exerciseRowId}`
  // Where Done goes: the page that linked here (the exercise page), kept a
  // path on THIS site — `returnTo` comes from the address bar (localPath).
  const returnTo = localPath(searchParams.get('returnTo') ?? exercisePath)
  const programQuery = useAssignedProgram(programId)
  const { data: program, isLoading, error } = programQuery
  // After a "Try again" that worked, focus goes to the page's heading.
  const heading = useRetryFocus<HTMLHeadingElement>('these photos', programQuery.isSuccess)
  // Before the early returns (the rules of hooks); see programLock.ts.
  const lock = useProgramLock(program)

  if (isLoading) {
    return <Loading className="mx-auto mt-8 max-w-2xl px-4" />
  }
  if (error || !program) return <ProgramLoadFailed query={programQuery} what="these photos" />

  const exercise = program.exercises.find((row) => row.id === exerciseRowId)
  if (!exercise) {
    const removed = program.retiredExercises.some((row) => row.id === exerciseRowId)
    return (
      <div className="mx-auto mt-8 max-w-2xl space-y-3 px-4">
        <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
          {program.title}
        </h1>
        <p role="alert" className="text-sm text-muted-foreground">
          {removed
            ? 'This exercise was removed from the program: its photos can no longer change.'
            : "This exercise isn't part of the program."}
        </p>
        <Link to={`/practitioner/programs/assigned/${programId}`} className="text-sm underline underline-offset-4">
          Back to the program
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-6 px-4">
      <div>
        <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
          This patient's photos
        </h1>
        <p className="text-sm text-muted-foreground">
          {exercise.name} · {program.title}
        </p>
      </div>
      {lock === null ? (
        <PhotoEditor program={program} exercise={exercise} />
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {lock === 'patient_deactivated'
              ? DEACTIVATED_PHOTOS_TEXT
              : 'This program is closed: its photos can no longer change.'}
          </p>
          <ExercisePhotoCarousel
            images={exercise.ownImages}
            exerciseName={exercise.name}
            emptyText="No photos for this patient."
          />
        </div>
      )}
      <Button asChild variant="outline">
        <Link to={returnTo}>Done</Link>
      </Button>
    </div>
  )
}

function PhotoEditor({
  program,
  exercise,
}: {
  program: AssignedProgramDetail
  exercise: AssignedProgramExercise
}) {
  const editing = useOwnPhotoEditing(program.id, exercise.id)
  // The library exercise's photos, only to COUNT them for the copy button
  // (`GET /exercises/:id` — the library is readable by every practitioner).
  // An archived library exercise keeps its photos, so it still counts.
  const library = useExercise(exercise.exerciseId)
  const libraryCount = library.data?.images.length
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDraggingFileOver, setIsDraggingFileOver] = useState(false)

  const ownCount = exercise.ownImages.length
  const room = photoRoom(ownCount)
  const copyProblem = libraryCount === undefined ? null : libraryCopyProblem(libraryCount, ownCount)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Checked here first, with the same words a refusal would have, so nothing
  // is uploaded that the server would refuse (uploadProblem); the server
  // checks again regardless.
  function handleFiles(files: File[]) {
    if (files.length === 0 || editing.isBusy) return
    const problem = uploadProblem(files, ownCount)
    if (problem) {
      editing.setProblem(problem)
      return
    }
    editing.upload.mutate(files)
  }

  // A drop while another change is on its way is ignored: it would send an
  // order built from a list about to be replaced (a photo being removed, say).
  // Only a real drag reaches this — jsdom measures no layout — so it's
  // covered in Chromium, not by the tests (the same for the library page).
  function handleDragEnd(event: DragEndEvent) {
    if (!event.over || editing.isBusy) return
    const order = computeReorderedKeys(exercise.ownImages, String(event.active.id), String(event.over.id))
    if (order) editing.reorder.mutate(order)
  }

  return (
    <div className="space-y-6">
      {/* Whether the patient sees them — adding never switches it. */}
      <p className="rounded-md border px-3 py-2 text-sm">
        {exercise.useLibraryImages
          ? `Not shown to the patient yet: they see the library's photos. To show these, choose "This patient's own photos" on the exercise page.`
          : 'The patient sees these photos, in this order.'}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{photoCountText(ownCount)}</p>
        <div className="flex flex-col items-end gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={libraryCount === undefined || copyProblem !== null || editing.isBusy}
            aria-describedby={copyProblem ? 'copy-library-problem' : undefined}
            onClick={() => editing.copyLibrary.mutate()}
          >
            {editing.copyLibrary.isPending
              ? 'Copying…'
              : libraryCount === undefined
                ? "Add the library's photos"
                : `Add the library's photos (${libraryCount})`}
          </Button>
          {copyProblem && (
            <p id="copy-library-problem" className="text-xs text-muted-foreground">
              {copyProblem}
            </p>
          )}
        </div>
      </div>

      {/* The drop zone, apart from the gallery: dragging a FILE in and
          dragging a PHOTO to reorder are never ambiguous (the library page's
          reasoning). */}
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setIsDraggingFileOver(true)
        }}
        onDragLeave={() => setIsDraggingFileOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setIsDraggingFileOver(false)
          handleFiles(Array.from(event.dataTransfer.files))
        }}
        className={
          isDraggingFileOver
            ? 'rounded-lg border-2 border-dashed border-ring bg-muted p-6 text-center'
            : 'rounded-lg border-2 border-dashed border-input p-6 text-center'
        }
      >
        <p className="text-sm text-muted-foreground">
          {room === 0 ? 'No room for more photos: remove one to add another.' : 'Drag photos here, or'}
        </p>
        {room > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            disabled={editing.isBusy}
            onClick={() => fileInputRef.current?.click()}
          >
            {editing.upload.isPending ? 'Uploading…' : 'Browse files'}
          </Button>
        )}
        {/* Reached through the button above (the library page's pattern).
            Its accessible name for the tests and assistive technology. */}
        <Input
          ref={fileInputRef}
          type="file"
          accept={IMAGE_FILE_ACCEPT}
          multiple
          aria-label="Photos to upload"
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? [])
            // Cleared at once: choosing the same file again must fire again.
            event.target.value = ''
            handleFiles(files)
          }}
        />
      </div>

      {editing.problem && (
        <p role="alert" className="text-sm text-destructive">
          {editing.problem}
        </p>
      )}

      {ownCount === 0 ? (
        <p className="text-sm text-muted-foreground">No photos for this patient yet.</p>
      ) : (
        <div className="space-y-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={exercise.ownImages.map((image) => image.objectKey)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {exercise.ownImages.map((image, index) => (
                  <SortableExerciseImage
                    key={image.objectKey}
                    image={image}
                    alt={`${exercise.name} photo ${index + 1}`}
                    onDelete={() => editing.remove.mutate(image.objectKey)}
                    deleting={editing.isBusy}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <p className="text-xs text-muted-foreground">
            The first photo is the cover. Removing a photo deletes it for good.
          </p>
        </div>
      )}
    </div>
  )
}