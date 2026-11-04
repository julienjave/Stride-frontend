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

import type { ExerciseDetail } from './types'

// Mirrors ExercisesService.assertCanModify exactly (backend's own
// authority for this check) — used here purely to decide whether to
// SHOW edit/delete/manage-photos affordances at all, not as the actual
// enforcement. The backend still checks this independently on every
// mutating request; this just avoids showing a button that would only
// ever 403 if clicked.
export function canModifyExercise(
  exercise: ExerciseDetail,
  currentUser: { id: number; activeRole: string },
): boolean {
  const isAdmin = currentUser.activeRole === 'admin'
  const isOwner =
    exercise.source === 'custom' && exercise.createdBy === currentUser.id
  return isAdmin || isOwner
}