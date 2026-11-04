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
// Whether the program can still change: only an ACTIVE program that isn't
// deleted. The backend refuses every write on a completed, cancelled or
// deleted one (409 — decisions §5, "The closed-program guard"), so the pages
// don't draw what would only be refused. One rule for the three pages that
// ask (step 3b-1b): the program page, and its exercise add / edit pages.
export function isProgramOpen(program: Pick<AssignedProgram, 'status' | 'isArchived'>): boolean {
  return program.status === 'active' && !program.isArchived
}