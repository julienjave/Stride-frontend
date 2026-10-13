import { PrescriptionSummary } from '@/common/PrescriptionSummary'
import { WorkoutHeader } from '@/workouts/WorkoutHeader'
import { groupExercisesByWorkout } from '@/workouts/workoutGroups'
import { ProgramPageSection } from './ProgramPageSection'
import type { AssignedProgramDetail, AssignedProgramExercise } from './types'

// The program's exercises, READ-ONLY for now: tailoring them is step 3b,
// which will swap this list for the editor (the template editor's
// components, with a program twin of useTemplateWorkoutEditing).
//
// Grouped by workout with the template editor's own rules
// (groupExercisesByWorkout) and header (WorkoutHeader, given no onRename /
// onDelete, so it draws only the label). The same shape rule as templates
// (3a-w): ONE workout → just the list, no header — "A" above everything
// would say nothing.
export function ProgramExercisesSection({ program }: { program: AssignedProgramDetail }) {
  const groups = groupExercisesByWorkout(program.workouts, program.exercises)
  const several = groups.length > 1

  return (
    <ProgramPageSection title="Exercises">
      {program.exercises.length === 0 && (
        <p className="text-sm text-muted-foreground">No exercises in this program.</p>
      )}
      {program.exercises.length > 0 &&
        groups.map((group) => (
          <div key={group.workout.id} className="space-y-2">
            {several && (
              <WorkoutHeader
                position={group.position}
                name={group.workout.name}
                label={group.label}
              />
            )}
            {group.exercises.length === 0 ? (
              <p className="text-sm text-muted-foreground">No exercises in this workout.</p>
            ) : (
              <ul className="space-y-2">
                {group.exercises.map((exercise) => (
                  <ExerciseItem key={exercise.id} exercise={exercise} />
                ))}
              </ul>
            )}
          </div>
        ))}
    </ProgramPageSection>
  )
}

// One exercise as the patient was given it: the program's own SNAPSHOT
// (name, muscles, prescription, notes — copied when assigned, decisions §1),
// never the library's current version.
function ExerciseItem({ exercise }: { exercise: AssignedProgramExercise }) {
  return (
    <li className="space-y-0.5 rounded-lg border p-3">
      <p className="font-medium">{exercise.name}</p>
      {exercise.primaryMuscles.length > 0 && (
        <p className="text-sm text-muted-foreground">{exercise.primaryMuscles.join(', ')}</p>
      )}
      <PrescriptionSummary prescription={exercise} />
      {exercise.notes && <p className="text-sm">{exercise.notes}</p>}
    </li>
  )
}