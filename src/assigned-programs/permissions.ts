import type { AssignedProgram } from './types'

// Unlike programs' canModifyExercise/canModifyProgram (which gate
// actions), this isn't about permission enforcement — GET
// /assigned-programs is already scoped server-side to a practitioner's
// own managed patients, so everything it returns is already something
// they're allowed to SEE. This is a narrower, presentation-level
// question specific to the programs hub: per the design discussion, a
// practitioner viewing/editing THEIR OWN programs there only wants to
// see assigned programs they themselves assigned, not every assigned
// program a shared patient happens to have from a different
// practitioner — that broader "everything this patient is on" view
// belongs to the patient management page instead, not this one.
export function isOwnAssignedProgram(
  program: AssignedProgram,
  currentUser: { id: number },
): boolean {
  return program.assignedBy === currentUser.id
}