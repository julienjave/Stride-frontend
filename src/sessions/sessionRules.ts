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

import type { AssignedProgramDetail } from '@/assigned-programs/types'
import type { Session, SessionExercise, SessionExerciseChanges } from './types'

// The running session's rules (pass (b), 2026-10-16). Pure: plain values
// in, plain values out (sessionRules.test.ts).

// Can the patient still DO this session — tick, rate, write notes? Only
// while it is open (`in_progress`; the three other statuses are final), and
// only on its own day: a session left open on an earlier day can't be
// finished any more (completing happens on a session's own day), so ticking
// it would record work that can never count. The backend would accept the
// ticks; the page offers what makes sense.
export function isRunnable(session: Pick<Session, 'status' | 'localDate'>, today: string): boolean {
  return session.status === 'in_progress' && session.localDate === today
}

// Where the player opens: the first exercise not done yet — so Resume
// lands where the patient stopped — or the first one when all are done.
export function firstToDoIndex(exercises: readonly Pick<SessionExercise, 'completed'>[]): number {
  const index = exercises.findIndex((exercise) => !exercise.completed)
  return index === -1 ? 0 : index
}

// The session with one checklist row changed — what the screen shows at
// once, before the server answers (an optimistic update). A NEW session and
// a new exercises array: the cached value is never modified in place
// (TanStack Query, like React, sees a change by a new reference).
export function applyExerciseChanges(
  session: Session,
  rowId: number,
  changes: SessionExerciseChanges,
): Session {
  return {
    ...session,
    exercises: session.exercises.map((exercise) =>
      exercise.id === rowId ? { ...exercise, ...changes } : exercise,
    ),
  }
}

// The values `changes` would replace on that row — what to put back if
// saving fails. Only the fields being changed: undoing a failed tick must not
// also undo a rating saved meanwhile.
export function previousValues(
  session: Session,
  rowId: number,
  changes: SessionExerciseChanges,
): SessionExerciseChanges {
  const row = session.exercises.find((exercise) => exercise.id === rowId)
  if (!row) return {}
  const keys = Object.keys(changes) as (keyof SessionExerciseChanges)[]
  return Object.fromEntries(keys.map((key) => [key, row[key]]))
}

// An exercise's photos: the PROGRAM's exercise it was copied from carries
// them (read live from the library — decisions §5, "Exercise photos on a
// program"), the session doesn't. Retired exercises included: a session
// started before an exercise was removed still shows its photos. None (an
// empty list) while the program loads, or if it can't be read.
export function photosFor(
  program: Pick<AssignedProgramDetail, 'exercises' | 'retiredExercises'> | undefined,
  assignedProgramExerciseId: number,
): { url: string }[] {
  if (!program) return []
  const row = [...program.exercises, ...program.retiredExercises].find(
    (exercise) => exercise.id === assignedProgramExerciseId,
  )
  return row ? row.images : []
}

// What the patient's note is sent as: trimmed, and nothing written means
// "no note" — `null` (the backend refuses a blank one: "leave it out
// instead"; `null` clears a note written earlier).
export function noteToSend(draft: string): string | null {
  const trimmed = draft.trim()
  return trimmed === '' ? null : trimmed
}

// The backend's limits for the patient's words (IsFeedback, IsEndNote):
// an exercise's or a session's feedback, and the note on a stop or a skip.
// The text fields cap their input at these (`maxLength`).
export const FEEDBACK_MAX_LENGTH = 2000
export const END_NOTE_MAX_LENGTH = 500