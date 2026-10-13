import { Link, useParams, useSearchParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/api/client'
import type { PrescriptionChanges } from '@/common/PrescriptionSummary'
import { localPath } from '@/exercises/pickerReturnHref'
import { EditableNumberField } from '@/programs/EditableNumberField'
import { EditableWeightField } from '@/programs/EditableWeightField'
import { EditableNotesField } from '@/programs/EditableNotesField'
import { assignedProgramQueryKey, updateProgramExercise } from './api'
import { isProgramOpen } from './permissions'
import { useAssignedProgram } from './useAssignedProgram'
import type { AssignedProgramExercise } from './types'

// One exercise of a patient's program, and its prescription — editable
// while the program is open (step 3b-1b):
// `/practitioner/programs/assigned/:id/exercises/:rowId`, reached by
// clicking an exercise card on the program page (`?returnTo=` that page).
//
// The template's exercise page (ProgramExercisePage) has the same shape,
// and the same per-field editors — given a `save` that PATCHes the PROGRAM
// here. Two differences, both because a program keeps its own COPY:
//   - the description shown (name, muscles, equipment, instructions) is the
//     program's copy, made when it was assigned — not the library's
//     current version, which a template shows. (Photos aren't copied yet,
//     so there are none here — deferred-improvements.md.)
//   - each session keeps a copy of the prescription it was given (3b-0), so
//     a change applies to NEW sessions only; the page says so.
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

  // What saving one field means here: PATCH the program's exercise, then
  // put the program the server answers with into its cache entry — this
  // page and the program page both read it, so both show the new value.
  async function save(changes: PrescriptionChanges) {
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

      <ProgramExerciseDescription exercise={exercise} libraryHref={libraryHref} />

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

// The program's own copy of the exercise's description, read-only here.
// Each list says "None" when empty, as the template's page does.
function ProgramExerciseDescription({
  exercise,
  libraryHref,
}: {
  exercise: AssignedProgramExercise
  libraryHref: string
}) {
  const lists = [
    ['Primary Muscles', exercise.primaryMuscles],
    ['Secondary Muscles', exercise.secondaryMuscles],
    ['Equipment', exercise.equipment],
  ] as const

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-medium">{exercise.name}</h2>
        <Button asChild variant="outline" size="sm">
          <Link to={libraryHref}>Find it in Library</Link>
        </Button>
      </div>
      <div className="space-y-3">
        {lists.map(([label, items]) => (
          <div key={label}>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-sm">{items.length > 0 ? items.join(', ') : 'None'}</p>
          </div>
        ))}
      </div>
      {exercise.instructions.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground">Instructions</p>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {exercise.instructions.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}