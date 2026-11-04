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

import { useQuery } from '@tanstack/react-query'
import { useWorkoutEditing } from '@/workouts/useWorkoutEditing'
import {
  addProgramWorkout,
  assignedProgramQueryKey,
  copyProgramExercises,
  fetchRemovalPreview,
  moveProgramExercise,
  removalPreviewQueryKey,
  removeProgramExercise,
  removeProgramWorkout,
  renameProgramWorkout,
  reorderProgramExercises,
  reorderProgramWorkouts,
} from './api'
import { removedNotice } from './programExerciseRules'
import type { AssignedProgramDetail, AssignedProgramExercise, ProgramWorkout } from './types'

// Every write the program page's exercise editor makes (step 3b-1): the
// shared machinery (src/workouts/useWorkoutEditing — the template page's
// since 3a-w), given the PROGRAM's routes and cache entry. One difference
// from a template: after a removal the editor says what really happened —
// deleted, or kept for the sessions that used it — read from the program
// as the server answered (removedNotice).
//
// Only the program's own entry is written (`setQueryData`); nothing else is
// refreshed. None of these writes changes what the lists show (title, dates,
// status) or what the summary judges (the schedule and the sessions — a
// day's workout is named by its id, which these never change).
export function useProgramWorkoutEditing(programId: number) {
  return useWorkoutEditing<ProgramWorkout, AssignedProgramExercise, AssignedProgramDetail>(
    assignedProgramQueryKey(programId),
    {
      addWorkout: () => addProgramWorkout(programId),
      removeWorkout: (workoutId) => removeProgramWorkout(programId, workoutId),
      renameWorkout: (workoutId, name) => renameProgramWorkout(programId, workoutId, name),
      reorderWorkouts: (order) => reorderProgramWorkouts(programId, order),
      reorderExercises: (workoutId, order) => reorderProgramExercises(programId, workoutId, order),
      moveExercise: (exerciseRowId, workoutId) =>
        moveProgramExercise(programId, exerciseRowId, workoutId),
      copyExercises: (exerciseIds, target) =>
        copyProgramExercises(programId, exerciseIds, target),
      removeExercise: (exerciseRowId) => removeProgramExercise(programId, exerciseRowId),
    },
    { noun: 'program', removedNotice },
  )
}

// What removing an exercise WOULD do — asked only while its dialog is open
// (`enabled`), and asked AGAIN each time it opens (staleTime 0): a patient
// may have started a session since, which turns "deleted" into "kept". The
// closing preview's pattern (useClosingPreview).
export function useRemovalPreview(
  programId: number,
  exerciseRowId: number,
  { enabled }: { enabled: boolean },
) {
  return useQuery({
    queryKey: removalPreviewQueryKey(programId, exerciseRowId),
    queryFn: () => fetchRemovalPreview(programId, exerciseRowId),
    enabled,
    staleTime: 0,
  })
}