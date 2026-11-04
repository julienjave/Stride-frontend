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

import { useWorkoutEditing } from '@/workouts/useWorkoutEditing'
import {
  addTemplateWorkout,
  copyTemplateExercises,
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
      copyExercises: (exerciseIds, target) =>
        copyTemplateExercises(templateId, exerciseIds, target),
      removeExercise: (exerciseRowId) => removeTemplateExercise(templateId, exerciseRowId),
    },
    { noun: 'template' },
  )
}