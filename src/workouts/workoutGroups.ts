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

import { workoutLabel } from '@/common/workoutLabel'

// The rules for editing workouts and the exercises inside them, as plain
// functions. Templates use them now (step 3a-w); an assigned program's page
// will use the same ones (step 3b) — its workouts and exercises have the
// same shape, only their parent differs. So these functions ask only for
// the few fields they read (`WorkoutLike`, `ExerciseLike`), not for a
// template's types: TypeScript accepts any object that HAS those fields
// ("structural typing"), so a program's workout fits as well as a
// template's.

// The backend's limits (src/common/workout-rules.ts). Copied, not
// imported — the frontend can't import backend code — so the backend stays
// the authority: these only let the screen say "no" before asking.
export const MAX_WORKOUTS = 10
export const WORKOUT_NAME_MAX_LENGTH = 100

export interface WorkoutLike {
  id: number
  name: string | null
  sortOrder: number
}

export interface ExerciseLike {
  id: number
  workoutId: number
  sortOrder: number
}

export interface WorkoutGroup<W, E> {
  workout: W
  // 0 for A, 1 for B… — the label's letter comes from it.
  position: number
  label: string
  exercises: E[]
}

// The exercise list cut into one group per workout, in the workouts' order.
//
// Both arrays are taken in the order they're GIVEN — never re-sorted by
// `sortOrder` here. The backend already sends them in display order, and
// when the screen reorders something before the server answers (an
// "optimistic" update, below) it rewrites the arrays' order. One source of
// truth for "what comes first": the array.
export function groupExercisesByWorkout<
  W extends WorkoutLike,
  E extends { workoutId: number },
>(workouts: W[], exercises: E[]): WorkoutGroup<W, E>[] {
  return workouts.map((workout, position) => ({
    workout,
    position,
    label: workoutLabel(position, workout.name),
    exercises: exercises.filter((exercise) => exercise.workoutId === workout.id),
  }))
}

// The position an exercise APPENDED to a workout should get: one more than
// that workout's last position, or 0 for an empty workout.
//
// Not the workout's COUNT: positions can have gaps. Removing an exercise
// doesn't renumber the others, so a workout can hold positions 0 and 2 —
// two exercises, and "2" is already taken. Last + 1 is always free and
// always last. (The backend appends workouts the same way, for the same
// reason.) And not the whole template's count either: positions restart at
// 0 in every workout.
//
// `Math.max(-1, ...positions)`: with no positions at all, max(-1) is -1,
// and -1 + 1 = 0. (`Math.max()` with nothing returns -Infinity.)
export function nextExercisePosition(
  exercises: ExerciseLike[],
  workoutId: number,
): number {
  const positions = exercises
    .filter((exercise) => exercise.workoutId === workoutId)
    .map((exercise) => exercise.sortOrder)
  return Math.max(-1, ...positions) + 1
}

// True when `order` lists exactly the ids in `ids`, each once (the backend's
// isPermutationOf). The optimistic updates below only rewrite the screen
// for a valid order; anything else is left to the server to refuse.
function isPermutationOf(order: number[], ids: number[]): boolean {
  const known = new Set(ids)
  return (
    order.length === ids.length &&
    new Set(order).size === order.length &&
    order.every((id) => known.has(id))
  )
}

// What the screen shows right after an exercise is dragged inside a
// workout, before the server answers: the flat list with THAT workout's
// exercises in the new order (positions renumbered 0, 1, 2…), every other
// exercise untouched and where it was.
//
// How: walk the flat list; each time a slot belongs to the workout, fill it
// with the next exercise of the new order. The workout's slots stay where
// they were in the flat list — only who sits in them changes.
export function applyExerciseOrder<E extends ExerciseLike>(
  exercises: E[],
  workoutId: number,
  order: number[],
): E[] {
  const inWorkout = exercises.filter((exercise) => exercise.workoutId === workoutId)
  if (!isPermutationOf(order, inWorkout.map((exercise) => exercise.id))) {
    return exercises
  }
  const byId = new Map(inWorkout.map((exercise) => [exercise.id, exercise]))
  let next = 0
  return exercises.map((exercise) => {
    if (exercise.workoutId !== workoutId) return exercise
    const position = next
    next += 1
    // The `as E` is safe: `order` was just checked to hold exactly these
    // workouts' ids, so every lookup finds one.
    return { ...(byId.get(order[position]) as E), sortOrder: position }
  })
}

// The same for the workouts themselves: the new order, positions 0, 1, 2…
// (the backend's reorderWorkouts writes exactly that).
export function applyWorkoutOrder<W extends WorkoutLike>(
  workouts: W[],
  order: number[],
): W[] {
  if (!isPermutationOf(order, workouts.map((workout) => workout.id))) {
    return workouts
  }
  const byId = new Map(workouts.map((workout) => [workout.id, workout]))
  return order.map((id, position) => ({ ...(byId.get(id) as W), sortOrder: position }))
}

// Whether a workout may be deleted — the backend's assertWorkoutRemovable,
// for what a TEMPLATE can know: never the last one (every exercise needs a
// workout to belong to), and only an empty one (deleting a workout must
// never take exercises with it — the practitioner moves or removes them
// first, one deliberate act each). A program adds two more rules (recorded
// sessions, schedule use) that 3b will pass in.
export function isWorkoutRemovable(state: {
  workoutCount: number
  exerciseCount: number
}): boolean {
  return state.workoutCount > 1 && state.exerciseCount === 0
}

// A typed workout name as the API stores it: trimmed, and "no name" sent as
// null — never '' (the database refuses a blank name; the backend would
// turn '' into null anyway, but the request then says what it means).
export function normalizeWorkoutName(name: string): string | null {
  const trimmed = name.trim()
  return trimmed === '' ? null : trimmed
}

// Where keyboard focus goes after an exercise is removed. Removing takes the
// exercise's card off the page — and with it the button (or the dialog
// inside it) that had focus — so the browser drops focus to the page itself,
// and a keyboard or screen-reader user starts again from the top. Instead,
// focus goes to something that still exists, chosen from the resource AS
// ANSWERED by the server:
//   1. the NEXT exercise of the same workout (by position) — its Remove
//      button, so tidying a workout can go on; Remove only opens a
//      confirmation (programs) or acts on the card it names;
//   2. otherwise the PREVIOUS one (the removed exercise was the last);
//   3. otherwise the workout's "Add New Exercise" card (it's now empty).
// `before` is the resource as it was (the removed exercise's workout and
// position are read from it); `after`, as the server answered. null when
// the removed exercise isn't in `before` (nothing to anchor on).
// `removedId` travels with the target: the list moves focus only once that
// exercise's card has left the screen (WorkoutListEditor says why).
export type FocusAfterRemoval = { removedId: number } & (
  | { kind: 'remove'; exerciseRowId: number }
  | { kind: 'add'; workoutId: number }
)

export function focusAfterRemoval<E extends ExerciseLike>(
  before: E[],
  after: E[],
  removedId: number,
): FocusAfterRemoval | null {
  const removed = before.find((exercise) => exercise.id === removedId)
  if (!removed) return null
  const left = after
    .filter((exercise) => exercise.workoutId === removed.workoutId && exercise.id !== removedId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const next = left.find((exercise) => exercise.sortOrder > removed.sortOrder)
  if (next) return { removedId, kind: 'remove', exerciseRowId: next.id }
  const previous = left.at(-1)
  if (previous) return { removedId, kind: 'remove', exerciseRowId: previous.id }
  return { removedId, kind: 'add', workoutId: removed.workoutId }
}