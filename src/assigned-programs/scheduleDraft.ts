// The schedule being edited — in the assign form today, in the program
// page's "Change schedule" next (3a-2) — and the pure rules that change it.
// The component (ScheduleFields) only calls these; the tests check them
// with plain values.
//
// WORKOUT REFERENCES. A schedule names workouts, but HOW depends on the
// moment: when assigning, the program's workouts don't exist yet, so the
// API takes their POSITION in the template (`workoutIndex`, 0 = A); later,
// the program's own ids (`workoutId`). Everything here works on a generic
// "workout reference" (a number) and receives the available references in
// order — [0, 1] when assigning, [57, 58] on a program. The rules never
// need to know which kind they hold.

export type ScheduleKind = 'weekdays' | 'times_per_week'

export interface DraftDay {
  // ISO weekday: 1 = Monday … 7 = Sunday.
  weekday: number
  // The workout chosen for that day — or null: "not chosen, follow the
  // suggestion". The suggestion is computed when needed (resolveDays),
  // never stored, so it stays right when other days are ticked or the
  // template changes. A stored suggestion would go stale.
  workout: number | null
}

export interface ScheduleDraft {
  type: ScheduleKind
  // The ticked days, kept sorted by weekday (week order is what the
  // suggestion and every display follow).
  days: DraftDay[]
  // Kept even while "Specific days" is chosen, so switching back and forth
  // doesn't lose it. Only the active type's fields are sent.
  timesPerWeek: number
  // null = the suggestion: every workout in order (A → B → C). The backend
  // applies the same default when no rotation is sent — so null is sent as
  // "no rotation", and an edited order as the list.
  rotation: number[] | null
}

// Same limit as the backend (MAX_ROTATION_LENGTH in schedule-input.dto.ts):
// two weeks of daily sessions.
export const MAX_ROTATION_LENGTH = 14

// The seven days, in ISO order. Fixed English words, like the rest of the
// app's copy.
export const WEEKDAYS = [
  { weekday: 1, short: 'Mon', long: 'Monday' },
  { weekday: 2, short: 'Tue', long: 'Tuesday' },
  { weekday: 3, short: 'Wed', long: 'Wednesday' },
  { weekday: 4, short: 'Thu', long: 'Thursday' },
  { weekday: 5, short: 'Fri', long: 'Friday' },
  { weekday: 6, short: 'Sat', long: 'Saturday' },
  { weekday: 7, short: 'Sun', long: 'Sunday' },
] as const

export function weekdayName(weekday: number, form: 'short' | 'long' = 'long'): string {
  return WEEKDAYS[weekday - 1][form]
}

// A new form: nothing ticked yet. Three a week as the starting count: the
// most common prescription, and it matches Mon / Wed / Fri.
export function emptyScheduleDraft(): ScheduleDraft {
  return { type: 'weekdays', days: [], timesPerWeek: 3, rotation: null }
}

// --- SPECIFIC DAYS -------------------------------------------------------------

// Ticks a day (its workout left to the suggestion) or unticks it. Returns a
// NEW draft — never changes the one it was given: React compares state by
// reference, and a mutated object looks unchanged to it.
export function toggleDay(draft: ScheduleDraft, weekday: number): ScheduleDraft {
  const isTicked = draft.days.some((day) => day.weekday === weekday)
  const days = isTicked
    ? draft.days.filter((day) => day.weekday !== weekday)
    : [...draft.days, { weekday, workout: null }].sort((a, b) => a.weekday - b.weekday)
  return { ...draft, days }
}

export function setDayWorkout(
  draft: ScheduleDraft,
  weekday: number,
  workout: number,
): ScheduleDraft {
  return {
    ...draft,
    days: draft.days.map((day) => (day.weekday === weekday ? { ...day, workout } : day)),
  }
}

// Every day's workout, resolved. A day with no valid choice gets the
// workout AFTER the previous day's (in week order), wrapping around; the
// first day gets the first workout. With A and B on Mon / Wed / Fri: A, B,
// A — and choosing A for Wednesday makes Friday's suggestion B. With one
// workout, every day is that one.
//
// "No VALID choice": null, or a reference that isn't among `workouts` (a
// leftover from another template). The form clears choices when the
// template changes (forgetWorkoutChoices), so this is a safety net — but a
// cheap one, and it means a stale choice can never be sent.
export function resolveDays(
  days: readonly DraftDay[],
  workouts: readonly number[],
): { weekday: number; workout: number }[] {
  const resolved: { weekday: number; workout: number }[] = []
  for (const day of days) {
    if (day.workout !== null && workouts.includes(day.workout)) {
      resolved.push({ weekday: day.weekday, workout: day.workout })
      continue
    }
    const previous = resolved.at(-1)
    const nextPosition = previous ? (workouts.indexOf(previous.workout) + 1) % workouts.length : 0
    resolved.push({ weekday: day.weekday, workout: workouts[nextPosition] })
  }
  return resolved
}

// --- N TIMES A WEEK --------------------------------------------------------------

export function setTimesPerWeek(draft: ScheduleDraft, timesPerWeek: number): ScheduleDraft {
  return { ...draft, timesPerWeek }
}

// The rotation in force: the edited one, or the suggestion (every workout in
// order). An edited rotation naming a workout that isn't available (again, a
// leftover) falls back to the suggestion as a whole: half of an old order
// means nothing.
export function resolveRotation(draft: ScheduleDraft, workouts: readonly number[]): number[] {
  if (draft.rotation && draft.rotation.every((workout) => workouts.includes(workout))) {
    return [...draft.rotation]
  }
  return [...workouts]
}

// "Edit order" starts from what's shown: the suggestion, now as a list the
// practitioner can change.
export function startEditingRotation(
  draft: ScheduleDraft,
  workouts: readonly number[],
): ScheduleDraft {
  return { ...draft, rotation: resolveRotation(draft, workouts) }
}

export function setRotationAt(
  draft: ScheduleDraft,
  workouts: readonly number[],
  position: number,
  workout: number,
): ScheduleDraft {
  const rotation = resolveRotation(draft, workouts)
  rotation[position] = workout
  return { ...draft, rotation }
}

// Never below one position: a rotation can't be empty (the backend refuses
// it — the rule spans two tables, so only the service can check it).
export function removeRotationAt(
  draft: ScheduleDraft,
  workouts: readonly number[],
  position: number,
): ScheduleDraft {
  const rotation = resolveRotation(draft, workouts)
  if (rotation.length <= 1) return draft
  rotation.splice(position, 1)
  return { ...draft, rotation }
}

// Adds a position at the end, continuing the cycle: after A, B comes A; after
// A, B, A comes B. Never past the limit.
export function addRotationPosition(
  draft: ScheduleDraft,
  workouts: readonly number[],
): ScheduleDraft {
  const rotation = resolveRotation(draft, workouts)
  if (rotation.length >= MAX_ROTATION_LENGTH) return draft
  const last = rotation[rotation.length - 1]
  rotation.push(workouts[(workouts.indexOf(last) + 1) % workouts.length])
  return { ...draft, rotation }
}

// "Use the suggested order" — back to null, so it follows the workouts again.
export function resetRotation(draft: ScheduleDraft): ScheduleDraft {
  return { ...draft, rotation: null }
}

// --- WHEN THE WORKOUTS CHANGE ----------------------------------------------------

// The template changed: its workouts aren't the previous template's, so
// every choice made for them is meaningless. The ticked days and the count
// stay (they're about the patient's week, not the template); the workouts
// go back to the suggestion.
export function forgetWorkoutChoices(draft: ScheduleDraft): ScheduleDraft {
  return {
    ...draft,
    days: draft.days.map((day) => ({ ...day, workout: null })),
    rotation: null,
  }
}

// --- FROM A STORED VERSION -------------------------------------------------------

// A stored schedule version → a draft to edit, for starting from what the
// patient already follows: "Assign again" (the source program's schedule,
// with POSITIONS as references) and "Change schedule" (3a-2's batch 2b,
// with the program's own ids). `refOf` turns a stored workout id into the
// form's reference — or null when there's none, which leaves that day's
// workout to the suggestion (a draft's null means exactly that).
//
// `refs` (the available references, in order): a stored rotation that is
// exactly the suggestion — every workout in order — comes back as null
// ("suggested"), not as an edited order, so the editor shows it as it was
// chosen. (When assigning, the backend stores the suggestion as a real
// list: a draft can't tell them apart without this.)
//
// A pause has nothing to edit: the caller picks the version to start from
// (the latest one that isn't a pause); given one anyway, it's a new draft.
export function draftFromVersion(
  version: {
    type: 'weekdays' | 'times_per_week' | 'paused'
    days: readonly { weekday: number; workoutId: number }[]
    timesPerWeek: number | null
    rotation: readonly number[]
  },
  refOf: (workoutId: number) => number | null,
  refs: readonly number[],
): ScheduleDraft {
  const empty = emptyScheduleDraft()
  if (version.type === 'weekdays') {
    return {
      ...empty,
      days: [...version.days]
        .sort((a, b) => a.weekday - b.weekday)
        .map((day) => ({ weekday: day.weekday, workout: refOf(day.workoutId) })),
    }
  }
  if (version.type === 'times_per_week') {
    const rotation = version.rotation.map(refOf)
    const isSuggestion =
      rotation.length === refs.length && rotation.every((ref, i) => ref === refs[i])
    return {
      ...empty,
      type: 'times_per_week',
      timesPerWeek: version.timesPerWeek ?? empty.timesPerWeek,
      // The order as stored — unless it IS the suggestion, or a workout of
      // it can't be named (half of an old order means nothing —
      // resolveRotation's rule): then null, the suggestion. `every`
      // narrows nothing for TypeScript, hence the filter.
      rotation:
        !isSuggestion && rotation.every((ref) => ref !== null)
          ? rotation.filter((ref): ref is number => ref !== null)
          : null,
    }
  }
  return empty
}