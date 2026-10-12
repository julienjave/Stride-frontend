import { describe, it, expect } from 'vitest'
import {
  applyExerciseOrder,
  applyWorkoutOrder,
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