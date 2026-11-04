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

import { describe, it, expect } from 'vitest'
import {
  canDeleteProgramWorkout,
  emptiesScheduledWorkout,
  isWorkoutInSchedule,
  isWorkoutScheduledFromToday,
  programWorkoutNote,
  removalText,
  removedNotice,
} from './programExerciseRules'
import type { ScheduleVersion } from './types'

// Versions as the backend sends them, oldest first. Workouts 57 (A) and
// 58 (B); 59 (C) only in a rotation.
function version(id: number, effectiveFrom: string, fields: Partial<ScheduleVersion>): ScheduleVersion {
  return {
    id,
    assignedProgramId: 12,
    type: 'weekdays',
    timesPerWeek: null,
    effectiveFrom,
    createdBy: 3,
    createdAt: `${effectiveFrom}T09:00:00Z`,
    days: [],
    rotation: [],
    ...fields,
  }
}

// Past: Mon A, Wed B (from June 2). Today's: Mon A (from June 16). Planned:
// 3 a week, rotation A → C (from June 30).
const VERSIONS = [
  version(1, '2031-06-02', { days: [{ weekday: 1, workoutId: 57 }, { weekday: 3, workoutId: 58 }] }),
  version(2, '2031-06-16', { days: [{ weekday: 1, workoutId: 57 }] }),
  version(3, '2031-06-30', { type: 'times_per_week', timesPerWeek: 3, rotation: [57, 59] }),
]
const TODAY = '2031-06-20'

describe('isWorkoutInSchedule — any version, past included', () => {
  it.each([
    [57, true],
    [58, true], // only in the past version — still in the schedule's history
    [59, true], // only in a planned rotation
    [60, false],
  ])('workout %i → %s', (workoutId, expected) => {
    expect(isWorkoutInSchedule(VERSIONS, workoutId)).toBe(expected)
  })
})

describe('isWorkoutScheduledFromToday — today and planned only', () => {
  it.each([
    [57, true], // today's version
    [58, false], // only the PAST version names it
    [59, true], // a planned version's rotation
    [60, false],
  ])('workout %i → %s', (workoutId, expected) => {
    expect(isWorkoutScheduledFromToday(VERSIONS, TODAY, workoutId)).toBe(expected)
  })

  // A pause names no workout: while paused with nothing planned after, no
  // workout is scheduled from today.
  it('names nothing while paused, with nothing planned', () => {
    const paused = [VERSIONS[0], version(4, '2031-06-16', { type: 'paused' })]
    expect(isWorkoutScheduledFromToday(paused, TODAY, 57)).toBe(false)
  })
})

describe('canDeleteProgramWorkout', () => {
  const deletable = { workoutCount: 2, exerciseCount: 0, retiredCount: 0, inSchedule: false }

  it('allows an empty, unscheduled workout when there are others', () => {
    expect(canDeleteProgramWorkout(deletable)).toBe(true)
  })

  // Each rule alone refuses: the others are left at their "deletable" value.
  it.each([
    ['the last workout', { workoutCount: 1 }],
    ['a workout with exercises', { exerciseCount: 1 }],
    ['a workout keeping a removed exercise', { retiredCount: 1 }],
    ['a workout the schedule names', { inSchedule: true }],
  ])('refuses %s', (_label, change) => {
    expect(canDeleteProgramWorkout({ ...deletable, ...change })).toBe(false)
  })
})

describe('programWorkoutNote — why an EMPTY workout has no Delete', () => {
  const empty = { workoutCount: 2, exerciseCount: 0, retiredCount: 0, inSchedule: false }

  it('explains the schedule first (it decides even with removed exercises too)', () => {
    expect(programWorkoutNote({ ...empty, inSchedule: true, retiredCount: 2 })).toBe(
      "Part of the schedule — now, planned or in its history — so it can't be deleted. To stop using it, change the schedule.",
    )
  })

  it.each([
    [1, "Keeps a removed exercise for its sessions' records, so it can't be deleted."],
    [3, "Keeps 3 removed exercises for its sessions' records, so it can't be deleted."],
  ])('explains %i removed exercise(s)', (retiredCount, text) => {
    expect(programWorkoutNote({ ...empty, retiredCount })).toBe(text)
  })

  it.each([
    ['a deletable workout (Delete is there)', empty],
    ['a workout with exercises (the hint below the list says it)', { ...empty, exerciseCount: 1, inSchedule: true }],
    ['the only workout (it has no header)', { ...empty, workoutCount: 1, inSchedule: true }],
  ])('says nothing for %s', (_label, state) => {
    expect(programWorkoutNote(state)).toBeNull()
  })
})

describe('emptiesScheduledWorkout', () => {
  const ex = (id: number, workoutId: number) => ({ id, workoutId })

  it("is true for the last exercise of a workout today's schedule uses", () => {
    const program = { exercises: [ex(1, 57), ex(2, 58)], schedules: VERSIONS }
    expect(emptiesScheduledWorkout(program, ex(1, 57), TODAY)).toBe(true)
  })

  it('is false while the workout keeps another exercise', () => {
    const program = { exercises: [ex(1, 57), ex(3, 57)], schedules: VERSIONS }
    expect(emptiesScheduledWorkout(program, ex(1, 57), TODAY)).toBe(false)
  })

  // B is only in the PAST version: emptying it harms no future session.
  it('is false for a workout only the past schedule used', () => {
    const program = { exercises: [ex(2, 58)], schedules: VERSIONS }
    expect(emptiesScheduledWorkout(program, ex(2, 58), TODAY)).toBe(false)
  })
})

describe('removalText', () => {
  it('says DELETED when no session used it', () => {
    expect(removalText({ outcome: 'deleted', sessionCount: 0 }, 'Squat', null)).toStrictEqual({
      title: 'Remove Squat?',
      description: 'No session has used it yet, so it will be deleted from the program.',
      warning: null,
    })
  })

  it.each([
    [1, "1 session used it. It will leave the program — new sessions won't include it — and stay in that session's record."],
    [4, "4 sessions used it. It will leave the program — new sessions won't include it — and stay in those sessions' records."],
  ])('says KEPT for %i session(s)', (sessionCount, description) => {
    expect(removalText({ outcome: 'retired', sessionCount }, 'Squat', null).description).toBe(description)
  })

  it.each([
    [
      true,
      "Workout B · Strength will have no exercises left, and the schedule uses it: the patient won't be able to start its sessions until it has one again.",
    ],
    [
      false,
      "The program will have no exercises left: the patient won't be able to start a session until it has one again.",
    ],
  ])('warns when it empties a scheduled workout (several workouts: %s)', (several, warning) => {
    expect(
      removalText({ outcome: 'deleted', sessionCount: 0 }, 'Squat', { label: 'B · Strength', several })
        .warning,
    ).toBe(warning)
  })
})

describe('removedNotice — what really happened, from the answer', () => {
  const kept = { id: 31 }

  it('says it stays in the records when the answer lists it as removed', () => {
    expect(
      removedNotice({ retiredExercises: [kept as never] }, { exerciseRowId: 31, name: 'Squat' }),
    ).toBe('Removed Squat from the program. It stays in the records of the sessions that used it.')
  })

  // ANOTHER exercise kept from earlier doesn't make this one "kept".
  it('says just "removed" when it was deleted', () => {
    expect(
      removedNotice({ retiredExercises: [kept as never] }, { exerciseRowId: 32, name: 'Plank' }),
    ).toBe('Removed Plank from the program.')
  })
})