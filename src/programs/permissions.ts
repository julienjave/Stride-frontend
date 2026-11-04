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

// The one rule every edit control on the template screens follows
// (TemplateDetailPage, and ProgramExercisePage for a single row). Two
// conditions, both required:
//
// - canModifyProgram: the same ownership rule the backend enforces, so
//   the UI never offers an action that would just come back as a 403.
// - !isArchived: an archived template is "deleted" as far as the app is
//   concerned. It stays viewable by direct URL (an old bookmark, say),
//   but read-only — even for its owner.
//
// Defined once here, rather than as `canModifyProgram(...) &&
// !template.isArchived` written out on each page, so the two screens can
// never drift into disagreeing about who can edit what.
//
// currentUser may be undefined — useCurrentUser()'s data type allows it,
// even though RequireAuth guarantees a session by the time these pages
// render. Treating "unknown user" as "can't edit" is the safe default.
export function canEditTemplate(
  template: ProgramTemplate,
  currentUser: { id: number; activeRole: string } | undefined | null,
): boolean {
  if (!currentUser || template.isArchived) return false
  return canModifyProgram(template, currentUser)
}

// Strict ownership: did THIS user create this template? Used for the
// "Yours" badge and the hub's "Only my templates" filter.
//
// Deliberately NOT canModifyProgram, which also returns true for any
// admin — "can I change it?" and "is it mine?" are different questions.
// An admin can modify every template, but none of them are theirs; with
// canModifyProgram, a badge would call every single template "Yours."
// (Admins can't reach the programs pages today, so the two happen to give
// the same answer there — but the badge should say what it means, not
// rely on that.)
export function isOwnTemplate(
  template: ProgramTemplate,
  currentUser: { id: number } | undefined | null,
): boolean {
  return currentUser != null && template.practitionerId === currentUser.id
}