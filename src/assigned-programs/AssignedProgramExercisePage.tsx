import { Link, useParams, useSearchParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/api/client'
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
import { isProgramOpen } from './permissions'
import { useAssignedProgram } from './useAssignedProgram'
import type { AssignedProgramExercise } from './types'

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
//     copy: they're the library exercise's, read live (decided 2026-10-14 —
//     illustrations, improved once for every program), and the page says so.
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
    return <p className="mx-auto mt-8 max-w-2xl px-4 text-sm text-destructive">Invalid exercise.</p>
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

  const { data: program, isLoading, error } = useAssignedProgram(programId)

  // What saving one field means here — for the prescription's fields and the
  // description's alike: PATCH the program's exercise, then put the program
  // the server answers with into its cache entry — this page and the program
  // page both read it, so both show the new value.
  async function save(changes: ProgramExerciseChanges) {
    const updated = await updateProgramExercise(programId, exerciseRowId, changes)
    queryClient.setQueryData(assignedProgramQueryKey(programId), updated)
  }

  if (isLoading) {
    return <p className="mx-auto mt-8 max-w-2xl px-4 text-sm text-muted-foreground">Loading…</p>
  }

  if (error || !program) {
    return (
      <p className="mx-auto mt-8 max-w-2xl px-4 text-sm text-destructive">
        {error instanceof ApiError && error.statusCode === 404
          ? "This program doesn't exist, or isn't one you can see."
          : "Couldn't load this exercise. Try refreshing."}
      </p>
    )
  }

  const exercise = program.exercises.find((row) => row.id === exerciseRowId)

  // Not IN the program: a removed (retired) exercise — kept for its
  // sessions' records, never edited again (decided 2026-10-13: removed
  // things are part of the record, not reachable for change) — or an id
  // that isn't this program's at all.
  if (!exercise) {
    const removed = program.retiredExercises.some((row) => row.id === exerciseRowId)
    return (
      <div className="mx-auto mt-8 max-w-2xl space-y-3 px-4">
        <h1 className="text-xl font-semibold">{program.title}</h1>
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

  const canEdit = isProgramOpen(program)
  const libraryHref = `/practitioner/library/${exercise.exerciseId}?returnTo=${encodeURIComponent(
    `/practitioner/programs/assigned/${programId}/exercises/${exerciseRowId}?returnTo=${encodeURIComponent(returnTo)}`,
  )}`

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-6 px-4 pb-8">
      <div>
        <h1 className="text-xl font-semibold">{program.title}</h1>
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

      <ProgramExercisePhotos exercise={exercise} />

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
// Read-only (no pencils) on a closed program: `canEdit`.
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

// The exercise's photos — the LIBRARY's, read live (2026-10-14), unlike the
// description above, which is this program's own copy. So the page says where
// they come from: the practitioner can't change them here, and a change in
// the library shows here (and in every program using the exercise). Shown
// the same on an open or a closed program — they aren't the program's to
// freeze. Photos chosen per program: the roadmap's "Program-specific photos".
function ProgramExercisePhotos({ exercise }: { exercise: AssignedProgramExercise }) {
  return (
    <section aria-labelledby="program-exercise-photos" className="space-y-2">
      <h3 id="program-exercise-photos" className="text-sm font-medium">
        Photos
      </h3>
      <ExercisePhotoCarousel
        images={exercise.images}
        exerciseName={exercise.name}
        emptyText="This exercise has no photos in the library."
      />
      <p className="text-xs text-muted-foreground">
        Photos come from the exercise in the library, so a change there shows here
        too. They aren't part of this program's copy.
      </p>
    </section>
  )
}