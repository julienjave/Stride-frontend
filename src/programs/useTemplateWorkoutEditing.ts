import { useWorkoutEditing } from '@/workouts/useWorkoutEditing'
import {
  addTemplateWorkout,
  copyTemplateExercise,
  moveTemplateExercise,
  programQueryKey,
  removeTemplateExercise,
  removeTemplateWorkout,
  renameTemplateWorkout,
  reorderTemplateExercises,
  reorderTemplateWorkouts,
} from './api'
import type { ProgramTemplateDetail, TemplateExercise, TemplateWorkout } from './types'

// Moved to src/workouts/ with the rest of the editor's machinery (3b-1);
// exported from here too, where its tests and older imports expect it.
export { describeFailure } from '@/workouts/useWorkoutEditing'

// Every write the workout editor makes on a TEMPLATE. Since 3b-1 the
// machinery — requests in, cache work, optimistic drags, messages — is the
// generic `useWorkoutEditing` (src/workouts/), shared with the program page;
// this hook only says WHICH requests and WHICH cache entry: the template's.
// (Built in 3a-w as one hook; split when the program page needed the same
// thing with other routes — see useWorkoutEditing for the reasoning.)
export function useTemplateWorkoutEditing(templateId: number) {
  return useWorkoutEditing<TemplateWorkout, TemplateExercise, ProgramTemplateDetail>(
    programQueryKey(templateId),
    {
      addWorkout: () => addTemplateWorkout(templateId),
      removeWorkout: (workoutId) => removeTemplateWorkout(templateId, workoutId),
      renameWorkout: (workoutId, name) => renameTemplateWorkout(templateId, workoutId, name),
      reorderWorkouts: (order) => reorderTemplateWorkouts(templateId, order),
      reorderExercises: (workoutId, order) =>
        reorderTemplateExercises(templateId, workoutId, order),
      moveExercise: (exerciseRowId, workoutId) =>
        moveTemplateExercise(templateId, exerciseRowId, workoutId),
      copyExercise: (source, workoutId, sortOrder) =>
        copyTemplateExercise(templateId, source, workoutId, sortOrder),
      removeExercise: (exerciseRowId) => removeTemplateExercise(templateId, exerciseRowId),
    },
    { noun: 'template' },
  )
}