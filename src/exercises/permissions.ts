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