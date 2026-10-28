import { Link, useParams, useSearchParams } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { failureText } from '@/api/apiErrors'
import { EditableExerciseListField } from '@/exercises/EditableExerciseListField'
import { EditableExerciseTitle } from '@/exercises/EditableExerciseTitle'
import { EXERCISE_LIST_RULES } from '@/exercises/descriptionRules'
import { localPath } from '@/exercises/pickerReturnHref'
import { EditableNumberField } from '@/programs/EditableNumberField'
import { EditableWeightField } from '@/programs/EditableWeightField'
import { EditableNotesField } from '@/programs/EditableNotesField'
import { ExercisePhotoCarousel } from '@/programs/ExercisePhotoCarousel'
import {
  assignedProgramQueryKey,
  updateProgramExercise,
  type ProgramExerciseChanges,
} from './api'
import { DEACTIVATED_EXERCISE_TEXT } from './programLock'
import { useProgramLock } from './useProgramLock'
import { ProgramLoadFailed, ProgramNotAvailable } from './ProgramNotAvailable'
import { noPhotosText, photoSourceText } from './programPhotos'
import { useAssignedProgram } from './useAssignedProgram'
import type { AssignedProgramExercise } from './types'
import { useRetryFocus } from '@/common/useRetryFocus'
import { Loading } from '@/common/Loading'

// One exercise of a patient's program — its description (step D-3) and its
// prescription (step 3b-1b), editable while the program is open:
// `/practitioner/programs/assigned/:id/exercises/:rowId`, reached by
// clicking an exercise card on the program page (`?returnTo=` that page).
//
// The template's exercise page (ProgramExercisePage) has the same shape,
// and the same per-field editors — given a `save` that PATCHes the PROGRAM
// here. Two differences, both because a program keeps its own COPY:
//   - the description (name, muscles, equipment, instructions) is the
//     program's copy, made when it was assigned — not the library's
//     current version, which a template shows (read-only there). Here it is
//     EDITABLE, for this patient only (step D-3), with the library page's
//     own fields given this page's `save`. The PHOTOS are not part of the
//     copy: by default they're the library exercise's, read live (decided
//     2026-10-14 — illustrations, improved once for every program); since
//     2026-10-17 the practitioner may choose this patient's OWN photos
//     instead, managed on their own page (ProgramExercisePhotosPage).
//   - each session keeps a copy of what it was given — the prescription
//     (3b-0) and the description (D-2) — so a change applies to NEW
//     sessions only; the page says so.
//
// No Remove here: removing has its dialog on the program page, where the
// workout and the schedule it may empty are in view (3b-1a).
export function AssignedProgramExercisePage() {
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

  return <ProgramExerciseView programId={programId} exerciseRowId={exerciseRowId} />
}

function ProgramExerciseView({
  programId,
  exerciseRowId,
}: {
  programId: number
  exerciseRowId: number
}) {
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const programPath = `/practitioner/programs/assigned/${programId}`
  // Where Done goes: the page that linked here, or the program's page. Kept
  // a path on THIS site (localPath): `returnTo` comes from the address bar.
  const returnTo = localPath(searchParams.get('returnTo') ?? programPath)

  const programQuery = useAssignedProgram(programId)
  const { data: program, isLoading, error } = programQuery
  // After a "Try again" that worked, focus goes to the program's title (on
  // the page, or above "isn't part of the program").
  const heading = useRetryFocus<HTMLHeadingElement>('this exercise', programQuery.isSuccess)
  // Called here, before any early return: hooks run in the same order on
  // every render. null while the program loads; 'closed' or
  // 'patient_deactivated' once it can't change (programLock.ts).
  const lock = useProgramLock(program)

  // What saving one field means here — for the prescription's fields and the
  // description's alike: PATCH the program's exercise, then put the program
  // the server answers with into its cache entry — this page and the program
  // page both read it, so both show the new value.
  async function save(changes: ProgramExerciseChanges) {
    const updated = await updateProgramExercise(programId, exerciseRowId, changes)
    queryClient.setQueryData(assignedProgramQueryKey(programId), updated)
  }

  if (isLoading) {
    return <Loading className="mx-auto mt-8 max-w-2xl px-4" />
  }

  if (error || !program) return <ProgramLoadFailed query={programQuery} what="this exercise" />

  const exercise = program.exercises.find((row) => row.id === exerciseRowId)

  // Not IN the program: a removed (retired) exercise — kept for its
  // sessions' records, never edited again (decided 2026-10-13: removed
  // things are part of the record, not reachable for change) — or an id
  // that isn't this program's at all.
  if (!exercise) {
    const removed = program.retiredExercises.some((row) => row.id === exerciseRowId)
    return (
      <div className="mx-auto mt-8 max-w-2xl space-y-3 px-4">
        <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
          {program.title}
        </h1>
        <p role="alert" className="text-sm text-muted-foreground">
          {removed
            ? 'This exercise was removed from the program. It stays in the records of the sessions that used it.'
            : "This exercise isn't part of the program."}
        </p>
        <Link to={programPath} className="text-sm underline underline-offset-4">
          Back to the program
        </Link>
      </div>
    )
  }

  const canEdit = lock === null
  const libraryHref = `/practitioner/library/${exercise.exerciseId}?returnTo=${encodeURIComponent(
    `/practitioner/programs/assigned/${programId}/exercises/${exerciseRowId}?returnTo=${encodeURIComponent(returnTo)}`,
  )}`

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-6 px-4 pb-8">
      <div>
        <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
          {program.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {canEdit ? '- Edit Exercise -' : '- View Exercise -'}
        </p>
      </div>

      <ProgramExerciseDescription
        exercise={exercise}
        libraryHref={libraryHref}
        save={save}
        canEdit={canEdit}
      />

      <ProgramExercisePhotos
        exercise={exercise}
        canEdit={canEdit}
        save={save}
        managePath={`/practitioner/programs/assigned/${programId}/exercises/${exerciseRowId}/photos?returnTo=${encodeURIComponent(
          `/practitioner/programs/assigned/${programId}/exercises/${exerciseRowId}?returnTo=${encodeURIComponent(returnTo)}`,
        )}`}
      />

      <div className="space-y-2">
        <div className="divide-y divide-border rounded-lg border px-4">
          <EditableNumberField
            save={save}
            canEdit={canEdit}
            fieldKey="sets"
            label="Sets"
            value={exercise.sets}
          />
          <EditableNumberField
            save={save}
            canEdit={canEdit}
            fieldKey="reps"
            label="Reps"
            value={exercise.reps}
          />
          <EditableNumberField
            save={save}
            canEdit={canEdit}
            fieldKey="durationInSeconds"
            label="Duration"
            value={exercise.durationInSeconds}
            displaySuffix="s"
          />
          <EditableWeightField
            save={save}
            canEdit={canEdit}
            weight={exercise.weight}
            weightUnit={exercise.weightUnit}
          />
          <EditableNotesField save={save} canEdit={canEdit} notes={exercise.notes} />
        </div>
        {/* What a change does to the record — the question a practitioner
            changing 3×10 to 4×8 mid-program will have (decisions §5,
            "sessions keep a copy of their prescription"). */}
        <p className="text-xs text-muted-foreground">
          {canEdit
            ? 'Changes apply to the next sessions. Sessions already done keep the prescription they were given.'
            : lock === 'patient_deactivated'
              ? DEACTIVATED_EXERCISE_TEXT
              : 'This program is closed: its exercises can no longer change.'}
        </p>
      </div>

      <Button asChild variant="outline">
        <Link to={returnTo}>{canEdit ? 'Done' : 'Back'}</Link>
      </Button>
    </div>
  )
}

// The program's own copy of the exercise's description (step D-3): the
// library page's fields — EditableExerciseTitle and EditableExerciseListField,
// with the same rules (EXERCISE_LIST_RULES) — given THIS page's `save`, so
// what they change is this patient's copy, never the library's exercise.
// Read-only (no pencils) on a closed program, or a deactivated patient's:
// `canEdit`.
function ProgramExerciseDescription({
  exercise,
  libraryHref,
  save,
  canEdit,
}: {
  exercise: AssignedProgramExercise
  libraryHref: string
  save: (changes: ProgramExerciseChanges) => Promise<unknown>
  canEdit: boolean
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-4">
        {/* An h2: the PROGRAM is this page's title (h1). */}
        <EditableExerciseTitle
          headingLevel={2}
          name={exercise.name}
          save={save}
          canEdit={canEdit}
        />
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link to={libraryHref}>Find it in Library</Link>
        </Button>
      </div>
      <div className="divide-y divide-border rounded-lg border px-4">
        {(['primaryMuscles', 'secondaryMuscles', 'equipment', 'instructions'] as const).map(
          (fieldKey) => (
            <EditableExerciseListField
              key={fieldKey}
              save={save}
              fieldKey={fieldKey}
              values={exercise[fieldKey]}
              canEdit={canEdit}
              {...EXERCISE_LIST_RULES[fieldKey]}
            />
          ),
        )}
      </div>
      {/* Whose copy this is — the question a practitioner rewriting a step
          for one patient will have: not the library, not other programs,
          and not the sessions already done (they keep their own copy, D-2).
          Nothing on a closed program: the prescription's note below says
          it can no longer change. */}
      {canEdit && (
        <p className="text-xs text-muted-foreground">
          This description is this program's own copy: changing it doesn't change the
          exercise in the library or in other programs. Sessions already done keep
          the description they were given.
        </p>
      )}
    </div>
  )
}

// The exercise's photos — the ones the PATIENT sees (`images`), and, while
// the program is open, which ones they are (program-specific photos,
// 2026-10-17):
//   - two radio buttons: the library's photos (read live — the default) or
//     this patient's own. Saved the moment one is chosen (one PATCH, one audit
//     entry) — and NOT optimistic, like the program's other settings: the
//     checked radio is always what the server holds, both are disabled while
//     saving, and a refusal is shown with the old choice still checked.
//     Native radios in a fieldset: the browser gives one choice, arrow keys,
//     and the group's question read with each option.
//   - a link to the photo page, ALWAYS offered while open (decided
//     2026-10-17): adding photos never switches the choice, so a practitioner
//     can prepare the photos first and switch when they're ready.
//   - a sentence saying where the photos come from — three cases, because
//     "own photos chosen, none yet" (the patient sees none, on purpose or
//     not) must not read like "the library has none" (photoSourceText).
// On a closed program: the photos and the sentence, nothing to change (the
// backend refuses any change anyway — 409).
function ProgramExercisePhotos({
  exercise,
  canEdit,
  save,
  managePath,
}: {
  exercise: AssignedProgramExercise
  canEdit: boolean
  save: (changes: ProgramExerciseChanges) => Promise<unknown>
  managePath: string
}) {
  // `(value) => save(…)`, never `mutationFn: save`: TanStack Query passes its
  // own context as a second argument (the 3b-2 lesson).
  const choose = useMutation({
    mutationFn: (useLibraryImages: boolean) => save({ useLibraryImages }),
  })
  const ownCount = exercise.ownImages.length

  return (
    <section aria-labelledby="program-exercise-photos" className="space-y-3">
      <h3 id="program-exercise-photos" className="text-sm font-medium">
        Photos
      </h3>
      {canEdit && (
        <fieldset className="space-y-1" disabled={choose.isPending}>
          <legend className="text-sm text-muted-foreground">
            Which photos does the patient see?
          </legend>
          {(
            [
              [true, 'Photos from the library'],
              [false, "This patient's own photos"],
            ] as const
          ).map(([value, label]) => (
            <label key={label} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`photo-source-${exercise.id}`}
                checked={exercise.useLibraryImages === value}
                onChange={() => choose.mutate(value)}
              />
              {label}
            </label>
          ))}
        </fieldset>
      )}
      {choose.isPending && (
        <p role="status" className="text-xs text-muted-foreground">
          Saving…
        </p>
      )}
      {choose.isError && (
        <p role="alert" className="text-sm text-destructive">
          {"Couldn't change the photos. "}
          {failureText(choose.error, 'Try again.')}
        </p>
      )}
      <ExercisePhotoCarousel
        images={exercise.images}
        exerciseName={exercise.name}
        emptyText={noPhotosText(exercise.useLibraryImages)}
      />
      <p className="text-xs text-muted-foreground">
        {photoSourceText(exercise.useLibraryImages, ownCount)}
      </p>
      {canEdit && (
        <Button asChild variant="outline" size="sm">
          <Link to={managePath}>
            {`Manage this patient's photos (${ownCount})`}
          </Link>
        </Button>
      )}
    </section>
  )
}