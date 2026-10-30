import { workoutLabel } from '@/common/workoutLabel'
import { MAX_WORKOUTS, type WorkoutGroup } from './workoutGroups'

// Copying exercises (roadmap Phase 6.5): one request for one exercise or
// several, into another workout or a NEW one — POST …/exercises/copy on a
// template and on a program alike. The rules the dialog and the editor need,
// as pure functions: tested with plain values (copyExercises.test.ts), the
// components only call them.

// Where the copies go: an existing workout, or a new one (named or not).
export type CopyTarget = { workoutId: number } | { newWorkoutName: string | null }

// The request body both routes take. A new workout is said in so many words
// — `targetWorkoutId: null` —, never by leaving the key out: the backend
// refuses a missing target rather than guess. A blank name is sent as null
// (the backend would store it as "no name" anyway; null is the one spelling).
export function copyRequestBody(exerciseIds: readonly number[], target: CopyTarget) {
  if ('workoutId' in target) {
    return { exerciseIds: [...exerciseIds], targetWorkoutId: target.workoutId }
  }
  const name = target.newWorkoutName?.trim() ?? ''
  return {
    exerciseIds: [...exerciseIds],
    targetWorkoutId: null,
    newWorkoutName: name === '' ? null : name,
  }
}

// What a message calls the copied exercises: the exercise's own name for
// one ("Squat"), a count for several ("3 exercises").
export function copySubject(count: number, onlyName: string): string {
  return count === 1 ? onlyName : `${count} exercises`
}

// The message after a copy. Said at the moment it matters: from now on the
// copies and their originals are separate — editing one changes nothing in
// the other (a template copies the prescription; a program its own
// description, prescription and photos).
export function copiedNotice(count: number, subject: string, targetLabel: string): string {
  return count === 1
    ? `Copied ${subject} to ${targetLabel}. The copy is independent: changing one won't change the other.`
    : `Copied ${subject} to ${targetLabel}. The copies are independent: changing one won't change its original.`
}

// The label a NEW workout will have: it is added after the last one, so its
// letter is the next position ("C", or "C · Warm-up").
export function newWorkoutLabel(workoutCount: number, name: string | null): string {
  return workoutLabel(workoutCount, name)
}

// Whether a new workout may still be created (the backend's limit: A–J).
export function canAddWorkout(workoutCount: number): boolean {
  return workoutCount < MAX_WORKOUTS
}

// What the dialog offers first: the NEXT workout after the source (the
// usual "copy the warm-up into B"), else the first other one, else a new
// workout — the only target a one-workout resource has. `'new'` = a new
// workout.
export function defaultCopyTarget<W extends { id: number }, E>(
  source: WorkoutGroup<W, E>,
  groups: readonly WorkoutGroup<W, E>[],
): number | 'new' {
  const others = groups.filter((group) => group.workout.id !== source.workout.id)
  const next = others.find((group) => group.position > source.position)
  const first = next ?? others[0]
  if (first) return first.workout.id
  return 'new'
}