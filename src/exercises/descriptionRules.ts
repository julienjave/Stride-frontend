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

// The rules for an exercise's DESCRIPTION — its name, muscles, equipment and
// instructions — as the backend states them (backend
// src/common/validators/exercise-description.ts, `EXERCISE_LISTS`; step D-1,
// 2026-10-14).
//
// The description is edited in three places: the library's New exercise form,
// the library's exercise page, and — since step D-3 — a program's exercise
// page, which edits that patient's own COPY. One table here, read by all
// three, so they can't drift apart the way the backend's three DTOs had
// (a 200- vs 255-character name, 500 vs 1,000 per step).
//
// The backend is still the authority: these limits only let a page say "too
// long" at once instead of after a round trip. They must never be LOOSER than
// the backend's (the page would then send something it refuses) — and being
// stricter has a cost too: the page sends a WHOLE list when one item changes,
// so a step limit below what is already stored makes that exercise
// uneditable. That is why steps are 1,000 here (26 imported exercises have a
// step longer than 500 — up to 744).

export const EXERCISE_NAME_MAX_LENGTH = 200

// The four lists, by the API's own field names.
export type ExerciseListKey =
  | 'primaryMuscles'
  | 'secondaryMuscles'
  | 'equipment'
  | 'instructions'

// What a page needs to show and check one list. The words are here too, so
// the library's page and a program's page call the same list by the same name.
export interface ExerciseListRules {
  label: string
  addButtonLabel: string
  // A human-readable singular noun for ONE entry, used in messages ("At least
  // one primary muscle is required").
  itemLabel: string
  // Absent for the two optional lists: "none" is an empty list, [].
  minCount?: number
  maxCount: number
  itemMaxLength: number
  // Instructions are steps, written as sentences: a text area each, and shown
  // as a numbered list.
  multiline?: boolean
}

// `Record<ExerciseListKey, …>`: a list added to the type without its rules is
// a compile error, not a page that silently skips it.
export const EXERCISE_LIST_RULES: Record<ExerciseListKey, ExerciseListRules> = {
  primaryMuscles: {
    label: 'Primary Muscles',
    addButtonLabel: 'Add primary muscle',
    itemLabel: 'primary muscle',
    minCount: 1,
    maxCount: 20,
    itemMaxLength: 100,
  },
  secondaryMuscles: {
    label: 'Secondary Muscles',
    addButtonLabel: 'Add secondary muscle',
    itemLabel: 'secondary muscle',
    maxCount: 20,
    itemMaxLength: 100,
  },
  equipment: {
    label: 'Equipment',
    addButtonLabel: 'Add equipment',
    itemLabel: 'equipment item',
    maxCount: 20,
    itemMaxLength: 100,
  },
  instructions: {
    label: 'Instructions',
    addButtonLabel: 'Add a Step',
    itemLabel: 'instruction',
    minCount: 1,
    maxCount: 50,
    itemMaxLength: 1000,
    multiline: true,
  },
}

// One PATCH's worth of description changes — the body both the library's
// `PATCH /exercises/:id` and a program's `PATCH …/exercises/:rowId` accept for
// these fields. Only what is sent changes. No `null` anywhere: every one of
// these columns is NOT NULL, and the backend refuses `null` (400) — "none" is
// [] for the two optional lists.
export type ExerciseDescriptionChanges = { name?: string } & Partial<
  Record<ExerciseListKey, string[]>
>