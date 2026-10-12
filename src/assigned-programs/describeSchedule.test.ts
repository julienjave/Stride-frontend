import { describe, it, expect } from 'vitest'
import { describeSchedule, type ScheduleToDescribe } from './describeSchedule'

// Workout references 0 and 1 named by their letters; `none` for a
// one-workout program, which names no workout at all.
const letters = (ref: number) => ['A', 'B'][ref]
const none = null

function weekdays(days: [number, number][]): ScheduleToDescribe {
  return {
    type: 'weekdays',
    days: days.map(([weekday, workout]) => ({ weekday, workout })),
    timesPerWeek: null,
    rotation: [],
  }
}

function perWeek(timesPerWeek: number, rotation: number[]): ScheduleToDescribe {
  return { type: 'times_per_week', days: [], timesPerWeek, rotation }
}

describe('describeSchedule — specific days', () => {
  it('names each day with its workout, in the order given', () => {
    expect(describeSchedule(weekdays([[1, 0], [3, 1], [5, 0]]), letters)).toBe(
      'Mon A · Wed B · Fri A',
    )
  })

  it('names only the days when the program has one workout', () => {
    expect(describeSchedule(weekdays([[2, 0], [7, 0]]), none)).toBe('Tue · Sun')
  })
})

describe('describeSchedule — N times a week', () => {
  it('gives the count, the week start and the rotation', () => {
    // 2031-06-05 is a Thursday.
    expect(describeSchedule(perWeek(3, [0, 1]), letters, '2031-06-05')).toBe(
      '3× a week · weeks start Thursday · A → B',
    )
  })

  it('leaves out what it was not given: the week start, or workouts to name', () => {
    expect(describeSchedule(perWeek(2, [0, 1, 0]), letters)).toBe('2× a week · A → B → A')
    expect(describeSchedule(perWeek(3, [0]), none, '2031-06-02')).toBe(
      '3× a week · weeks start Monday',
    )
  })
})

describe('describeSchedule — paused', () => {
  it('says so', () => {
    expect(
      describeSchedule({ type: 'paused', days: [], timesPerWeek: null, rotation: [] }, letters),
    ).toBe('Paused')
  })
})