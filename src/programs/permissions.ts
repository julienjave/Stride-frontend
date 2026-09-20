import type { ProgramTemplate } from './types'

// Mirrors ProgramsService.assertCanModify — used to filter which
// templates the Assign screen even OFFERS as options, since GET
// /programs returns every non-archived template system-wide, not just
// the requesting practitioner's own (unlike GET /assigned-programs,
// which is already properly scoped server-side per role). Showing a
// template here that addExercise would just 403 on is exactly the "one
// more moving part nobody asked for" this codebase avoids elsewhere
// (see ExerciseDetailPage's identical reasoning for Edit/Delete/Manage
// Photos).
export function canModifyProgram(
  template: ProgramTemplate,
  currentUser: { id: number; activeRole: string },
): boolean {
  const isAdmin = currentUser.activeRole === 'admin'
  const isOwner = template.practitionerId === currentUser.id
  return isAdmin || isOwner
}