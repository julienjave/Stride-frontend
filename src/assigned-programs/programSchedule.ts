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

import { workoutLabel, workoutLetter } from '@/common/workoutLabel'
import { describeSchedule, type ScheduleToDescribe } from './describeSchedule'
import type { ProgramWorkout, ScheduleVersion } from './types'

// The program page's rules about a program's SCHEDULE VERSIONS and its
// WORKOUTS, as pure functions (plain values in, plain values out — the
// same split as assignForm.ts: the page only calls them, the tests check
// them with plain values).

// --- WORKOUTS -----------------------------------------------------------------

// How a screen names a program's workouts, built once from the program's
// ordered `workouts`:
//   - letterOf(57) → 'A'                (for compact schedules: "Mon A · Wed B")
//   - labelOf(57)  → 'A · Mobility'     (for "Up next" and the exercise list)
//   - several      → whether there's more than one workout at all.
// With ONE workout, naming it says nothing ("Mon A · Wed A · Fri A"), so
// screens leave it out — `several` is how they know.
//
// The letter comes from the workout's place in the array (A = first), the
// order the backend sends — the same rule as groupExercisesByWorkout, so a
// workout is "B" everywhere on the page. An id the program doesn't have
// can't come from the backend (a schedule may only name the program's own
// workouts — a database rule); '?' rather than a crash if it ever did.
export interface WorkoutNames {
  letterOf: (workoutId: number) => string
  labelOf: (workoutId: number) => string
  several: boolean
}

export function workoutNames(workouts: readonly ProgramWorkout[]): WorkoutNames {
  // A Map from id to position: one pass to build, then each lookup is
  // direct — instead of searching the array for every day of every week.
  const positions = new Map(workouts.map((workout, position) => [workout.id, position]))
  return {
    letterOf: (workoutId) => {
      const position = positions.get(workoutId)
      return position === undefined ? '?' : workoutLetter(position)
    },
    labelOf: (workoutId) => {
      const position = positions.get(workoutId)
      return position === undefined ? '?' : workoutLabel(position, workouts[position].name)
    },
    several: workouts.length > 1,
  }
}

// --- SCHEDULE VERSIONS ----------------------------------------------------------

// A stored version → the shape describeSchedule words. describeSchedule
// takes "a workout reference" — positions when the assign form describes a
// draft, ids here — so the days' `workoutId` becomes `workout`.
export function toDescribable(version: ScheduleVersion): ScheduleToDescribe {
  return {
    type: version.type,
    days: version.days.map((day) => ({ weekday: day.weekday, workout: day.workoutId })),
    timesPerWeek: version.timesPerWeek,
    rotation: version.rotation,
  }
}

// A version in words — "Mon A · Wed B · Fri A", "3× a week · weeks start
// Friday · A → B", "Paused" — letters only when there are several workouts.
// startDate: the PROGRAM's start (program weeks start on its weekday, not
// on the version's: decisions §5, point 6).
export function describeVersion(
  version: ScheduleVersion,
  names: WorkoutNames,
  startDate: string,
): string {
  return describeSchedule(toDescribable(version), names.several ? names.letterOf : null, startDate)
}

// Which version is in force, and which are planned after it.
//
// The rule is the schedule module's (decisions §5, point 5): a day is
// judged by the LATEST version starting on or before it. The versions come
// oldest first, so it's the last one whose effectiveFrom ≤ the day.
// (Calendar dates as 'YYYY-MM-DD' strings compare as dates — calendarDate.ts.)
//
// Before the program starts, no version has begun yet: the FIRST one (it
// starts on the start date) is the schedule the patient will begin with,
// so it's the one shown as "the schedule", and anything after it is
// planned. After the program, the last version is simply the last one used.
//
// `planned` = every version after the current one. They all start after
// `today` — that's what made the current one current — so "planned" never
// includes the past.
export function currentAndPlanned(
  versions: readonly ScheduleVersion[],
  today: string,
): { current: ScheduleVersion | null; planned: ScheduleVersion[] } {
  if (versions.length === 0) return { current: null, planned: [] }
  let index = 0
  versions.forEach((version, i) => {
    if (version.effectiveFrom <= today) index = i
  })
  return { current: versions[index], planned: versions.slice(index + 1) }
}