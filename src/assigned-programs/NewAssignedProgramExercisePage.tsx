import { Link, useParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { NewWorkoutExerciseView } from '@/workouts/NewWorkoutExerciseView'
import type { AddTemplateExerciseFormValues } from '@/programs/schemas'
import { ProgramLoadFailed, ProgramNotAvailable } from './ProgramNotAvailable'
import { addProgramExercise, assignedProgramQueryKey } from './api'
import { DEACTIVATED_ADD_EXERCISE_TEXT } from './programLock'
import { useProgramLock } from './useProgramLock'
import { useAssignedProgram } from './useAssignedProgram'

// Adding an exercise to a patient's program (step 3b-1b):
// `/practitioner/programs/assigned/:id/exercises/new`, reached from a
// workout's "Add New Exercise" card on the program page (`?workoutId=58`
// with several workouts), through the library picker and back
// (`&exerciseId=9`).
//
// The page itself is the template's (NewWorkoutExerciseView, src/workouts/):
// the picker round trip, the workout in the address, the prescription form.
// What makes it a PROGRAM's is here — which program, what adding means (the
// program route, then the program's cache entry), and one case a template
// doesn't have: a CLOSED program, whose exercises can't change any more.
export function NewAssignedProgramExercisePage() {
  const { id } = useParams<{ id: string }>()
  const programId = Number(id)

  if (!id || !Number.isInteger(programId) || programId < 1) {
    return <ProgramNotAvailable />
  }

  return <NewProgramExercise programId={programId} />
}

function NewProgramExercise({ programId }: { programId: number }) {
  const queryClient = useQueryClient()
  // Usually already cached: the practitioner comes from the program page.
  const programQuery = useAssignedProgram(programId)
  const { data: program, error } = programQuery
  const lock = useProgramLock(program)
  const programPath = `/practitioner/programs/assigned/${programId}`

  // The request, then the answer — the whole program — into its cache
  // entry, so the program page shows the new card the moment it opens.
  // Nothing else is refreshed: adding an exercise changes neither what the
  // lists show (title, dates, status) nor what the summary judges (the
  // schedule names workouts by id, and sessions are the patient's).
  async function add(
    exerciseId: number,
    values: AddTemplateExerciseFormValues,
    workoutId: number | null,
  ) {
    const updated = await addProgramExercise(programId, exerciseId, values, workoutId)
    queryClient.setQueryData(assignedProgramQueryKey(programId), updated)
  }

  if (error) return <ProgramLoadFailed query={programQuery} what="this program" />

  // Said before the form, not after a refused Add: the backend would answer
  // 409, but the practitioner would have picked an exercise and filled in a
  // prescription for nothing. (Reached by an old link or the Back button
  // after the program was completed or cancelled.)
  // The same for a deactivated patient's program (decisions §22) — its
  // exercises can't change until an admin reactivates the account.
  if (program && lock !== null) {
    return (
      <div className="mx-auto mt-8 max-w-2xl space-y-3 px-4">
        <h1 className="text-xl font-semibold">{program.title}</h1>
        <p role="alert" className="text-sm text-muted-foreground">
          {lock === 'patient_deactivated'
            ? DEACTIVATED_ADD_EXERCISE_TEXT
            : "This program is closed: its exercises can't change any more."}
        </p>
        <Link to={programPath} className="text-sm underline underline-offset-4">
          Back to the program
        </Link>
      </div>
    )
  }

  return (
    <NewWorkoutExerciseView
      noun="program"
      resource={program}
      resourcePath={programPath}
      add={add}
    />
  )
}