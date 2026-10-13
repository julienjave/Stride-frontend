import { describe, it, expect } from 'vitest'
import {
  MAX_ROTATION_LENGTH,
  addRotationPosition,
  emptyScheduleDraft,
  forgetWorkoutChoices,
  removeRotationAt,
  resetRotation,
  resolveDays,
  resolveRotation,
  setDayWorkout,
  setRotationAt,
  setTimesPerWeek,
  startEditingRotation,
  toggleDay,
  weekdayName,
  type ScheduleDraft,
  draftFromVersion,
} from './scheduleDraft'

// Workout references as the program page will use them — ids, not 0, 1 —
// so a rule that confused "a reference" with "a position" fails here.
const AB = [57, 58]
const ABC = [57, 58, 59]

function draft(overrides: Partial<ScheduleDraft> = {}): ScheduleDraft {
  return { ...emptyScheduleDraft(), ...overrides }
}

describe('emptyScheduleDraft', () => {
  it('starts on specific days, nothing ticked, 3 a week kept ready, the suggested order', () => {
    expect(emptyScheduleDraft()).toStrictEqual({
      type: 'weekdays',
      days: [],
      timesPerWeek: 3,
      rotation: null,
    })
  })
})

describe('weekdayName', () => {
  it('names ISO weekdays, long by default', () => {
    expect(weekdayName(1)).toBe('Monday')
    expect(weekdayName(7, 'short')).toBe('Sun')
  })
})

describe('toggleDay', () => {
  it('ticks a day with no workout chosen yet, keeping the days in week order', () => {
    const friday = toggleDay(draft(), 5)
    const both = toggleDay(friday, 1)
    expect(both.days).toStrictEqual([
      { weekday: 1, workout: null },
      { weekday: 5, workout: null },
    ])
  })

  it('unticks a ticked day, leaving the others as they were', () => {
    const start = draft({
      days: [
        { weekday: 1, workout: 58 },
        { weekday: 3, workout: null },
      ],
    })
    expect(toggleDay(start, 3).days).toStrictEqual([{ weekday: 1, workout: 58 }])
  })

  it('returns a new draft and leaves the given one untouched', () => {
    const start = draft()
    const next = toggleDay(start, 2)
    expect(next).not.toBe(start)
    expect(start.days).toStrictEqual([])
  })
})

describe('setDayWorkout', () => {
  it("sets one day's workout only", () => {
    const start = draft({
      days: [
        { weekday: 1, workout: null },
        { weekday: 3, workout: null },
      ],
    })
    expect(setDayWorkout(start, 3, 57).days).toStrictEqual([
      { weekday: 1, workout: null },
      { weekday: 3, workout: 57 },
    ])
  })
})

describe('resolveDays', () => {
  const days = (...entries: [number, number | null][]) =>
    entries.map(([weekday, workout]) => ({ weekday, workout }))

  it('suggests the next workout after the previous day’s, wrapping round: A, B, A', () => {
    expect(resolveDays(days([1, null], [3, null], [5, null]), AB)).toStrictEqual([
      { weekday: 1, workout: 57 },
      { weekday: 3, workout: 58 },
      { weekday: 5, workout: 57 },
    ])
  })

  it('follows a choice: after an explicit A on Wednesday, Friday is suggested B', () => {
    expect(resolveDays(days([1, null], [3, 57], [5, null]), AB)).toStrictEqual([
      { weekday: 1, workout: 57 },
      { weekday: 3, workout: 57 },
      { weekday: 5, workout: 58 },
    ])
  })

  it('keeps choices as they are, even a first day that is not A', () => {
    expect(resolveDays(days([2, 59], [4, null]), ABC)).toStrictEqual([
      { weekday: 2, workout: 59 },
      { weekday: 4, workout: 57 },
    ])
  })

  it('gives every day the only workout when there is one', () => {
    expect(resolveDays(days([1, null], [2, null]), [57])).toStrictEqual([
      { weekday: 1, workout: 57 },
      { weekday: 2, workout: 57 },
    ])
  })

  it('treats a choice that is not among the workouts as no choice', () => {
    // 99: a leftover from another template. It must never be sent.
    expect(resolveDays(days([1, 99], [3, null]), AB)).toStrictEqual([
      { weekday: 1, workout: 57 },
      { weekday: 3, workout: 58 },
    ])
  })
})

describe('setTimesPerWeek', () => {
  it('changes the count only', () => {
    expect(setTimesPerWeek(draft({ rotation: [58] }), 5)).toStrictEqual(
      draft({ rotation: [58], timesPerWeek: 5 }),
    )
  })
})

describe('resolveRotation', () => {
  it('is every workout in order when not edited', () => {
    expect(resolveRotation(draft(), ABC)).toStrictEqual([57, 58, 59])
  })

  it('is the edited order when it has one', () => {
    expect(resolveRotation(draft({ rotation: [58, 57, 58] }), AB)).toStrictEqual([58, 57, 58])
  })

  it('falls back to the suggestion as a whole when the order names a missing workout', () => {
    expect(resolveRotation(draft({ rotation: [57, 99] }), AB)).toStrictEqual([57, 58])
  })

  it('returns a copy: changing it never changes the draft', () => {
    const start = draft({ rotation: [58, 57] })
    resolveRotation(start, AB).push(57)
    expect(start.rotation).toStrictEqual([58, 57])
  })
})

describe('editing the rotation', () => {
  it('"Edit order" starts from the suggestion, now as a list', () => {
    expect(startEditingRotation(draft(), AB).rotation).toStrictEqual([57, 58])
  })

  it('sets one position', () => {
    const editing = draft({ rotation: [57, 58] })
    expect(setRotationAt(editing, AB, 1, 57).rotation).toStrictEqual([57, 57])
    // The draft it was given is left alone.
    expect(editing.rotation).toStrictEqual([57, 58])
  })

  it('removes a position, but never the last one', () => {
    expect(removeRotationAt(draft({ rotation: [57, 58, 57] }), AB, 0).rotation).toStrictEqual([
      58, 57,
    ])
    const single = draft({ rotation: [58] })
    expect(removeRotationAt(single, AB, 0)).toBe(single)
  })

  it('adds the workout after the last one, continuing the cycle', () => {
    expect(addRotationPosition(draft({ rotation: [57, 58] }), AB).rotation).toStrictEqual([
      57, 58, 57,
    ])
    expect(addRotationPosition(draft({ rotation: [58, 57] }), ABC).rotation).toStrictEqual([
      58, 57, 58,
    ])
  })

  it(`stops at ${MAX_ROTATION_LENGTH} positions`, () => {
    const full = draft({ rotation: Array.from({ length: MAX_ROTATION_LENGTH }, () => 57) })
    expect(addRotationPosition(full, AB)).toBe(full)
    const almost = draft({ rotation: Array.from({ length: MAX_ROTATION_LENGTH - 1 }, () => 57) })
    expect(addRotationPosition(almost, AB).rotation).toHaveLength(MAX_ROTATION_LENGTH)
  })

  it('"Use the suggested order" forgets the edited one', () => {
    expect(resetRotation(draft({ rotation: [58] })).rotation).toBeNull()
  })
})

describe('forgetWorkoutChoices', () => {
  it('keeps the days and the count, and lets every workout follow the suggestion again', () => {
    const start = draft({
      type: 'times_per_week',
      days: [
        { weekday: 1, workout: 58 },
        { weekday: 4, workout: null },
      ],
      timesPerWeek: 2,
      rotation: [58, 57],
    })
    expect(forgetWorkoutChoices(start)).toStrictEqual({
      type: 'times_per_week',
      days: [
        { weekday: 1, workout: null },
        { weekday: 4, workout: null },
      ],
      timesPerWeek: 2,
      rotation: null,
    })
  })
})

describe('draftFromVersion', () => {
  // Stored ids 57 / 58; the form's references here are positions 0 / 1 —
  // as when assigning again. A rule that kept the ids would fail.
  const refOf = (workoutId: number) => ({ 57: 0, 58: 1 })[workoutId] ?? null

  it('turns specific days into ticked days with their workouts, in week order', () => {
    expect(
      draftFromVersion(
        {
          type: 'weekdays',
          days: [
            { weekday: 5, workoutId: 57 },
            { weekday: 1, workoutId: 57 },
            { weekday: 3, workoutId: 58 },
          ],
          timesPerWeek: null,
          rotation: [],
        },
        refOf,
        [0, 1],
      ),
    ).toStrictEqual({
      type: 'weekdays',
      days: [
        { weekday: 1, workout: 0 },
        { weekday: 3, workout: 1 },
        { weekday: 5, workout: 0 },
      ],
      timesPerWeek: 3,
      rotation: null,
    })
  })

  it('leaves a day whose workout it can\'t name to the suggestion', () => {
    const draft = draftFromVersion(
      { type: 'weekdays', days: [{ weekday: 2, workoutId: 99 }], timesPerWeek: null, rotation: [] },
      refOf,
      [0, 1],
    )
    expect(draft.days).toStrictEqual([{ weekday: 2, workout: null }])
  })

  it('keeps a weekly count and its order', () => {
    expect(
      draftFromVersion(
        { type: 'times_per_week', days: [], timesPerWeek: 2, rotation: [58, 57, 58] },
        refOf,
        [0, 1],
      ),
    ).toStrictEqual({ type: 'times_per_week', days: [], timesPerWeek: 2, rotation: [1, 0, 1] })
  })

  // A, B with workouts A, B is the suggestion itself: shown as suggested,
  // not as an edited order. (B, A, B above is a real choice.)
  it('gives back the suggestion as "suggested", not as an edited order', () => {
    expect(
      draftFromVersion(
        { type: 'times_per_week', days: [], timesPerWeek: 2, rotation: [57, 58] },
        refOf,
        [0, 1],
      ).rotation,
    ).toBeNull()
    // …but a shorter order isn't the suggestion: A alone, with A and B.
    expect(
      draftFromVersion(
        { type: 'times_per_week', days: [], timesPerWeek: 2, rotation: [57] },
        refOf,
        [0, 1],
      ).rotation,
    ).toStrictEqual([0])
  })

  it('falls back to the suggested order when a workout of it can\'t be named', () => {
    expect(
      draftFromVersion(
        { type: 'times_per_week', days: [], timesPerWeek: 2, rotation: [58, 99] },
        refOf,
        [0, 1],
      ).rotation,
    ).toBeNull()
  })

  it('starts a new draft from a pause', () => {
    expect(
      draftFromVersion({ type: 'paused', days: [], timesPerWeek: null, rotation: [] }, refOf, [0, 1]),
    ).toStrictEqual(emptyScheduleDraft())
  })
})