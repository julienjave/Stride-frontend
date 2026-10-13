import { currentAndPlanned } from './programSchedule'
import type {
  AssignedProgramDetail,
  AssignedProgramExercise,
  RemovalPreview,
  ScheduleVersion,
} from './types'

// The rules of tailoring a program's exercises on its page (step 3b-1), as
// plain functions — tested with plain values; the components only call them.
// Settled with the person 2026-10-13 (decisions §5): a used exercise is
// RETIRED, not deleted; workouts are never retired — the page explains why
// one can't be deleted instead.

// Whether a schedule version names this workout — on a day, or in a
// rotation slot. (A pause names none.)
function versionUses(version: ScheduleVersion, workoutId: number): boolean {
  return (
    version.days.some((day) => day.workoutId === workoutId) ||
    version.rotation.includes(workoutId)
  )
}

// Whether ANY schedule version — past, current or planned — names the
// workout. The backend refuses to delete such a workout (409): past days
// were judged against it, so it stays.
export function isWorkoutInSchedule(versions: readonly ScheduleVersion[], workoutId: number) {
  return versions.some((version) => versionUses(version, workoutId))
}

// Whether the schedule in force TODAY, or one planned after it, names the
// workout — the versions that will still ask the patient for it. (Past
// versions don't: emptying a workout only the past used harms no one.)
export function isWorkoutScheduledFromToday(
  versions: readonly ScheduleVersion[],
  today: string,
  workoutId: number,
) {
  const { current, planned } = currentAndPlanned(versions, today)
  return [current, ...planned].some((version) => !!version && versionUses(version, workoutId))
}

interface WorkoutState {
  workoutCount: number
  // Exercises IN the workout.
  exerciseCount: number
  // Removed ones (retired) still belonging to it: kept for the sessions
  // that used them, they keep the workout too (the database's foreign key
  // would refuse the delete).
  retiredCount: number
  inSchedule: boolean
}

// Whether Delete is offered on a program workout: never the last, only an
// empty one — removed exercises included — and never one any schedule
// version names. One rule the page can't check: sessions done with it (the
// page doesn't see sessions); the backend's 409 stays the backstop for that.
// (The template's rule, isWorkoutRemovable, is the first two parts.)
export function canDeleteProgramWorkout(state: WorkoutState): boolean {
  return (
    state.workoutCount > 1 &&
    state.exerciseCount === 0 &&
    state.retiredCount === 0 &&
    !state.inSchedule
  )
}

// The line under an EMPTY workout's header saying why it has no Delete — the
// case a practitioner would otherwise find puzzling ("it's empty, why can't
// I delete it?"). Nothing for a workout with exercises: the hint under the
// list ("move or remove its exercises first") already says it.
export function programWorkoutNote(state: WorkoutState): string | null {
  if (state.exerciseCount > 0 || state.workoutCount <= 1) return null
  if (state.inSchedule) {
    return "Part of the schedule — now, planned or in its history — so it can't be deleted. To stop using it, change the schedule."
  }
  if (state.retiredCount > 0) {
    const things = state.retiredCount === 1 ? 'a removed exercise' : `${state.retiredCount} removed exercises`
    return `Keeps ${things} for its sessions' records, so it can't be deleted.`
  }
  return null
}

// Whether removing this exercise would leave its workout EMPTY while the
// schedule (today's or a planned one) still asks for that workout: the
// patient couldn't start that workout's sessions (the backend refuses a
// session with no exercises). Not refused — the practitioner may be about
// to add another — but said before confirming.
// It asks only for what it reads (ids and workouts, the versions), so its
// tests can pass plain objects.
export function emptiesScheduledWorkout(
  program: {
    exercises: readonly Pick<AssignedProgramExercise, 'id' | 'workoutId'>[]
    schedules: readonly ScheduleVersion[]
  },
  exercise: Pick<AssignedProgramExercise, 'id' | 'workoutId'>,
  today: string,
): boolean {
  const others = program.exercises.filter(
    (other) => other.workoutId === exercise.workoutId && other.id !== exercise.id,
  )
  return (
    others.length === 0 &&
    isWorkoutScheduledFromToday(program.schedules, today, exercise.workoutId)
  )
}

export interface RemovalText {
  title: string
  description: string
  // The amber warning when the removal empties a scheduled workout.
  warning: string | null
}

// What the removal dialog says, from the backend's answer (the preview).
// `emptied` — the workout it would empty, when the schedule uses it: its
// label, and whether the program has several workouts (with one, "the
// program" says it better than "workout A").
export function removalText(
  preview: RemovalPreview,
  name: string,
  emptied: { label: string; several: boolean } | null,
): RemovalText {
  const n = preview.sessionCount
  const description =
    preview.outcome === 'deleted'
      ? 'No session has used it yet, so it will be deleted from the program.'
      : `${n === 1 ? '1 session' : `${n} sessions`} used it. It will leave the program — new sessions won't include it — and stay in ${n === 1 ? "that session's record" : "those sessions' records"}.`
  const warning = !emptied
    ? null
    : emptied.several
      ? `Workout ${emptied.label} will have no exercises left, and the schedule uses it: the patient won't be able to start its sessions until it has one again.`
      : "The program will have no exercises left: the patient won't be able to start a session until it has one again."
  return { title: `Remove ${name}?`, description, warning }
}

// What the editor announces once the exercise is gone — from the program
// as the server answered, so it says what REALLY happened (the preview is a
// moment's answer; a session may have started in between).
export function removedNotice(
  updated: Pick<AssignedProgramDetail, 'retiredExercises'>,
  removal: { exerciseRowId: number; name: string },
): string {
  const kept = updated.retiredExercises.some((exercise) => exercise.id === removal.exerciseRowId)
  return kept
    ? `Removed ${removal.name} from the program. It stays in the records of the sessions that used it.`
    : `Removed ${removal.name} from the program.`
}