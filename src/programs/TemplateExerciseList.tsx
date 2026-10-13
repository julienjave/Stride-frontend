import {
  groupExercisesByWorkout,
  isWorkoutRemovable,
  type WorkoutGroup,
} from '@/workouts/workoutGroups'
import { WorkoutHeader } from '@/workouts/WorkoutHeader'
import { WorkoutListEditor } from '@/workouts/WorkoutListEditor'
import {
  TemplateExerciseCard,
  ReadOnlyTemplateExerciseCard,
} from './TemplateExerciseCard'
import { AddTemplateExerciseCard } from './AddTemplateExerciseCard'
import { useTemplateWorkoutEditing } from './useTemplateWorkoutEditing'
import type { TemplateExercise, TemplateWorkout } from './types'

type Group = WorkoutGroup<TemplateWorkout, TemplateExercise>

interface TemplateExerciseListProps {
  templateId: number
  // Passed in from the parent's own useProgram() data rather than read
  // here with a second useProgram() call — the parent already has it, and
  // this keeps the list a component that simply renders what it's given.
  workouts: TemplateWorkout[]
  exercises: TemplateExercise[]
  canEdit: boolean
}

// A template's exercises, workout by workout (step 3a-w; the editable list
// is the shared WorkoutListEditor since 3b-1).
//
// The SHAPE depends on how many workouts there are (decisions §5: "a
// one-workout program shows just its exercises"):
//   - ONE workout — the list as it always was: no header, one Add card,
//     drag to reorder. Plus "Add a workout", which is how a second appears.
//   - SEVERAL — a section per workout ("A · Mobility"), each with its own
//     exercises, its own Add card, and a header to rename it, delete it (when
//     empty) or drag it; each card gets a Move / Copy menu.
//
// Exercises are dragged only WITHIN their workout (each workout's list is its
// own DndContext); moving one to another workout is the menu's job (see
// ExerciseWorkoutMenu for why).
export function TemplateExerciseList({
  templateId,
  workouts,
  exercises,
  canEdit,
}: TemplateExerciseListProps) {
  const groups = groupExercisesByWorkout(workouts, exercises)
  if (!canEdit) {
    return <ReadOnlyWorkouts templateId={templateId} groups={groups} />
  }
  return <EditableWorkouts templateId={templateId} groups={groups} />
}

// --- READ-ONLY -------------------------------------------------------------
//
// Split from the editable view for the rules of hooks: the editable one needs
// mutations and drag sensors, and hooks can't be called conditionally. This
// one needs no hooks at all.

function ReadOnlyWorkouts({ templateId, groups }: { templateId: number; groups: Group[] }) {
  if (groups.length <= 1) {
    const exercises = groups[0]?.exercises ?? []
    if (exercises.length === 0) {
      return <p className="text-sm text-muted-foreground">This template has no exercises.</p>
    }
    return <ReadOnlyCards templateId={templateId} exercises={exercises} />
  }
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.workout.id} aria-label={`Workout ${group.label}`} className="space-y-2">
          <WorkoutHeader position={group.position} name={group.workout.name} label={group.label} />
          {group.exercises.length === 0 ? (
            <p className="text-sm text-muted-foreground">No exercises in this workout.</p>
          ) : (
            <ReadOnlyCards templateId={templateId} exercises={group.exercises} />
          )}
        </section>
      ))}
    </div>
  )
}

function ReadOnlyCards({
  templateId,
  exercises,
}: {
  templateId: number
  exercises: TemplateExercise[]
}) {
  return (
    <div className="space-y-2">
      {exercises.map((exercise) => (
        <ReadOnlyTemplateExerciseCard key={exercise.id} templateId={templateId} item={exercise} />
      ))}
    </div>
  )
}

// --- EDITABLE --------------------------------------------------------------
//
// The list itself — the workouts as sortable sections, each workout's
// sortable exercises, the Move / Copy menu, "Add a workout" — is the shared
// WorkoutListEditor (src/workouts/, lifted out of this file in 3b-1 for the
// program page). What is a TEMPLATE's here: its card (a link to the
// exercise's page; removed at once, no dialog), its Add card, and its
// delete rule (empty, not the last).

function EditableWorkouts({ templateId, groups }: { templateId: number; groups: Group[] }) {
  const editing = useTemplateWorkoutEditing(templateId)
  const exerciseName = (exercise: TemplateExercise) => exercise.exercise?.name ?? 'Unknown exercise'

  return (
    <WorkoutListEditor
      groups={groups}
      editing={editing}
      exerciseName={exerciseName}
      renderCard={(exercise, { workoutLabel, menu }) => (
        <TemplateExerciseCard
          templateId={templateId}
          item={exercise}
          workoutLabel={workoutLabel}
          menu={menu}
          onDelete={() =>
            editing.removeExercise.mutate({
              exerciseRowId: exercise.id,
              name: exerciseName(exercise),
            })
          }
          deleting={
            editing.removeExercise.isPending &&
            editing.removeExercise.variables?.exerciseRowId === exercise.id
          }
        />
      )}
      renderAddCard={(group, several) => (
        <AddTemplateExerciseCard
          templateId={templateId}
          workoutId={several ? group.workout.id : undefined}
          workoutLabel={several ? group.label : undefined}
        />
      )}
      canDeleteWorkout={(group) =>
        isWorkoutRemovable({
          workoutCount: groups.length,
          exerciseCount: group.exercises.length,
        })
      }
      deleteHint="To delete a workout, move or remove its exercises first."
    />
  )
}