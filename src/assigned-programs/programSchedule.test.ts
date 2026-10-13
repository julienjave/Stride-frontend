import { describe, it, expect } from 'vitest'
import { currentAndPlanned, describeVersion, toDescribable, workoutNames } from './programSchedule'
import type { ProgramWorkout, ScheduleVersion } from './types'

// Ids far from positions on purpose (57, 58): a rule that mixed up "a
// workout's id" and "its position" would give A/B for 0/1 and fail here.
const MOBILITY: ProgramWorkout = { id: 57, assignedProgramId: 12, name: 'Mobility', sortOrder: 0 }
const STRENGTH: ProgramWorkout = { id: 58, assignedProgramId: 12, name: null, sortOrder: 1 }

function version(
  effectiveFrom: string,
  fields: Partial<ScheduleVersion> = {},
): ScheduleVersion {
  return {
    id: 1,
    assignedProgramId: 12,
    type: 'weekdays',
    timesPerWeek: null,
    effectiveFrom,
    createdBy: 3,
    createdAt: `${effectiveFrom}T09:00:00.000Z`,
    days: [],
    rotation: [],
    ...fields,
  }
}

describe('workoutNames', () => {
  // Listed B first: the letter follows the ARRAY's order (what the backend
  // sends, and what groupExercisesByWorkout uses), not sortOrder or id.
  const names = workoutNames([STRENGTH, MOBILITY])

  it("letters and labels a workout by its place in the program's list", () => {
    expect(names.letterOf(58)).toBe('A')
    expect(names.letterOf(57)).toBe('B')
    expect(names.labelOf(58)).toBe('A')
    expect(names.labelOf(57)).toBe('B · Mobility')
  })

  it("says '?' for an id the program doesn't have, instead of crashing", () => {
    expect(names.letterOf(99)).toBe('?')
    expect(names.labelOf(99)).toBe('?')
  })

  it('knows whether there is more than one workout', () => {
    expect(names.several).toBe(true)
    expect(workoutNames([MOBILITY]).several).toBe(false)
  })
})

describe('toDescribable', () => {
  it("passes a version's days on with their workout ids", () => {
    expect(
      toDescribable(
        version('2031-06-02', {
          days: [
            { weekday: 1, workoutId: 57 },
            { weekday: 3, workoutId: 58 },
          ],
        }),
      ),
    ).toStrictEqual({
      type: 'weekdays',
      days: [
        { weekday: 1, workout: 57 },
        { weekday: 3, workout: 58 },
      ],
      timesPerWeek: null,
      rotation: [],
    })
  })
})

describe('describeVersion', () => {
  const two = workoutNames([MOBILITY, STRENGTH])
  const one = workoutNames([MOBILITY])

  it('names each day with its workout letter when there are several workouts', () => {
    const days = version('2031-06-02', {
      days: [
        { weekday: 1, workoutId: 57 },
        { weekday: 3, workoutId: 58 },
        { weekday: 5, workoutId: 57 },
      ],
    })
    expect(describeVersion(days, two, '2031-06-02')).toBe('Mon A · Wed B · Fri A')
    expect(describeVersion(days, one, '2031-06-02')).toBe('Mon · Wed · Fri')
  })

  it("starts program weeks on the PROGRAM's start weekday, not the version's", () => {
    // The version starts on a Monday (2 June 2031), the program on a
    // Thursday (29 May): weeks run Thursday to Wednesday whatever the
    // version's own date (decisions §5, point 6).
    const weekly = version('2031-06-02', {
      type: 'times_per_week',
      timesPerWeek: 3,
      rotation: [57, 58],
    })
    expect(describeVersion(weekly, two, '2031-05-29')).toBe(
      '3× a week · weeks start Thursday · A → B',
    )
  })

  it('says "Paused" for a pause', () => {
    expect(describeVersion(version('2031-06-02', { type: 'paused' }), two, '2031-06-02')).toBe(
      'Paused',
    )
  })
})

describe('currentAndPlanned', () => {
  const first = version('2031-06-02', { id: 1 })
  const second = version('2031-06-16', { id: 2 })
  const third = version('2031-06-30', { id: 3 })
  const versions = [first, second, third]

  it('picks the latest version started on or before today, and plans the rest', () => {
    // 20 June: the 16 June version is in force — not the first (which an
    // "oldest" rule gives) nor the last (which a "newest" rule gives).
    expect(currentAndPlanned(versions, '2031-06-20')).toStrictEqual({
      current: second,
      planned: [third],
    })
  })

  it('counts a version starting today as in force', () => {
    expect(currentAndPlanned(versions, '2031-06-16').current).toBe(second)
    expect(currentAndPlanned(versions, '2031-06-15').current).toBe(first)
  })

  it('shows the first version before the program starts, with the others planned', () => {
    expect(currentAndPlanned(versions, '2031-05-30')).toStrictEqual({
      current: first,
      planned: [second, third],
    })
  })

  it('shows the last version after every version has started, with nothing planned', () => {
    expect(currentAndPlanned(versions, '2031-08-01')).toStrictEqual({
      current: third,
      planned: [],
    })
  })

  it('has nothing to show for a program without versions', () => {
    expect(currentAndPlanned([], '2031-06-20')).toStrictEqual({ current: null, planned: [] })
  })
})