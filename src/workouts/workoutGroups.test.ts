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
  applyExerciseOrder,
  applyWorkoutOrder,
  focusAfterRemoval,
  groupExercisesByWorkout,
  isWorkoutRemovable,
  nextExercisePosition,
  normalizeWorkoutName,
} from './workoutGroups'

// Ids far from positions (57, 58…) on purpose: a rule that mixed up "an id"
// and "a position" would pass with ids 0, 1, 2.
const A = { id: 57, name: 'Mobility', sortOrder: 0 }
const B = { id: 58, name: null, sortOrder: 1 }

const ex = (id: number, workoutId: number, sortOrder: number) => ({
  id,
  workoutId,
  sortOrder,
})

describe('groupExercisesByWorkout', () => {
  it('makes one group per workout, in the order given, each with its label and its own exercises', () => {
    const exercises = [ex(1, 57, 0), ex(2, 57, 1), ex(3, 58, 0)]
    expect(groupExercisesByWorkout([A, B], exercises)).toStrictEqual([
      { workout: A, position: 0, label: 'A · Mobility', exercises: [ex(1, 57, 0), ex(2, 57, 1)] },
      { workout: B, position: 1, label: 'B', exercises: [ex(3, 58, 0)] },
    ])
  })

  it('follows the ARRAY order, not sortOrder (an optimistic reorder rewrites the arrays)', () => {
    // B first in the array even though its sortOrder says 1: the array wins,
    // and so does the exercises' array order within a workout.
    const groups = groupExercisesByWorkout([B, A], [ex(2, 57, 0), ex(1, 57, 1)])
    expect(groups.map((group) => group.label)).toStrictEqual(['A', 'B · Mobility'])
    expect(groups[1].exercises.map((exercise) => exercise.id)).toStrictEqual([2, 1])
  })

  it('gives an empty workout an empty group, not none', () => {
    expect(groupExercisesByWorkout([A, B], [ex(1, 57, 0)])[1].exercises).toStrictEqual([])
  })
})

describe('nextExercisePosition', () => {
  it('is 0 for an empty workout', () => {
    expect(nextExercisePosition([ex(1, 57, 0)], 58)).toBe(0)
  })

  it("is one past the workout's LAST position — not its count, when a removal left a gap", () => {
    // Positions 0 and 2: two exercises, but 2 is taken. A count would say 2.
    expect(nextExercisePosition([ex(1, 57, 0), ex(2, 57, 2)], 57)).toBe(3)
  })

  it("counts only that workout's positions — they restart at 0 in every workout", () => {
    // A has 3 exercises; B has one at 0. The whole template's count (4) would
    // leave a gap in B.
    const exercises = [ex(1, 57, 0), ex(2, 57, 1), ex(3, 57, 2), ex(4, 58, 0)]
    expect(nextExercisePosition(exercises, 58)).toBe(1)
  })
})

describe('applyExerciseOrder', () => {
  const exercises = [ex(1, 57, 0), ex(2, 57, 1), ex(3, 58, 0), ex(4, 58, 1)]

  it("reorders that workout's exercises, renumbers their positions, and leaves the other workout alone", () => {
    expect(applyExerciseOrder(exercises, 58, [4, 3])).toStrictEqual([
      ex(1, 57, 0),
      ex(2, 57, 1),
      ex(4, 58, 0),
      ex(3, 58, 1),
    ])
  })

  it('keeps the workout in its place in the flat list (the first workout here)', () => {
    expect(applyExerciseOrder(exercises, 57, [2, 1])).toStrictEqual([
      ex(2, 57, 0),
      ex(1, 57, 1),
      ex(3, 58, 0),
      ex(4, 58, 1),
    ])
  })

  it("changes nothing for an order that isn't exactly that workout's exercises", () => {
    expect(applyExerciseOrder(exercises, 57, [1])).toBe(exercises)
    expect(applyExerciseOrder(exercises, 57, [1, 1])).toBe(exercises)
    expect(applyExerciseOrder(exercises, 57, [1, 3])).toBe(exercises)
  })
})

describe('applyWorkoutOrder', () => {
  it('puts the workouts in the new order with positions 0, 1…', () => {
    expect(applyWorkoutOrder([A, B], [58, 57])).toStrictEqual([
      { ...B, sortOrder: 0 },
      { ...A, sortOrder: 1 },
    ])
  })

  it("changes nothing for an order that isn't exactly the workouts", () => {
    const workouts = [A, B]
    expect(applyWorkoutOrder(workouts, [58])).toBe(workouts)
    expect(applyWorkoutOrder(workouts, [58, 58])).toBe(workouts)
    expect(applyWorkoutOrder(workouts, [58, 99])).toBe(workouts)
  })
})

describe('isWorkoutRemovable', () => {
  it.each([
    [{ workoutCount: 2, exerciseCount: 0 }, true],
    [{ workoutCount: 2, exerciseCount: 1 }, false],
    // The last workout, even empty.
    [{ workoutCount: 1, exerciseCount: 0 }, false],
  ])('%o → %s', (state, expected) => {
    expect(isWorkoutRemovable(state)).toBe(expected)
  })
})

describe('normalizeWorkoutName', () => {
  it.each([
    ['  Upper body ', 'Upper body'],
    ['', null],
    ['   ', null],
  ])('%j → %j', (typed, sent) => {
    expect(normalizeWorkoutName(typed)).toBe(sent)
  })
})

describe('focusAfterRemoval', () => {
  // Workout A (57): positions 0, 2, 5 — gaps on purpose, and STORED out of
  // position order (ids 1, 3, 2), so neither "the next id" nor "the next in
  // the list" gives the right answer. Workout B (58): one exercise, which
  // must never be chosen for A.
  const before = [ex(1, 57, 0), ex(3, 57, 5), ex(2, 57, 2), ex(9, 58, 1)]
  const without = (id: number) => before.filter((exercise) => exercise.id !== id)

  it('chooses the next exercise of the same workout, by position', () => {
    expect(focusAfterRemoval(before, without(1), 1)).toEqual({
      removedId: 1,
      kind: 'remove',
      exerciseRowId: 2,
    })
  })

  it('chooses the previous one when the last was removed', () => {
    expect(focusAfterRemoval(before, without(3), 3)).toEqual({
      removedId: 3,
      kind: 'remove',
      exerciseRowId: 2,
    })
  })

  it("chooses the workout's Add card when it is now empty", () => {
    expect(focusAfterRemoval(before, without(9), 9)).toEqual({
      removedId: 9,
      kind: 'add',
      workoutId: 58,
    })
  })

  // Read from the server's ANSWER: an exercise the answer no longer has
  // (removed meanwhile by someone else) is never chosen.
  it('chooses only among the exercises the answer still has', () => {
    const answered = without(1).filter((exercise) => exercise.id !== 2)
    expect(focusAfterRemoval(before, answered, 1)).toEqual({
      removedId: 1,
      kind: 'remove',
      exerciseRowId: 3,
    })
  })

  it("chooses nothing when the removed exercise wasn't in the resource", () => {
    expect(focusAfterRemoval(before, before, 42)).toBeNull()
  })
})