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
import { describeDraft, describeSchedule, type ScheduleToDescribe } from './describeSchedule'
import { emptyScheduleDraft } from './scheduleDraft'

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

describe('describeDraft', () => {
  // Program workout ids, as on the program page.
  const refs = [57, 58]
  const letterOf = (ref: number) => ({ 57: 'A', 58: 'B' })[ref] ?? '?'

  it('words what will be sent: a day left to the suggestion shows the suggested workout', () => {
    const draft = {
      ...emptyScheduleDraft(),
      days: [
        { weekday: 1, workout: null },
        { weekday: 3, workout: 57 },
        { weekday: 5, workout: null },
      ],
    }
    expect(describeDraft(draft, refs, letterOf)).toBe('Mon A · Wed A · Fri B')
  })

  it('shows the suggested order for an unedited rotation, and the program weeks', () => {
    const draft = { ...emptyScheduleDraft(), type: 'times_per_week' as const, timesPerWeek: 2 }
    // 2031-06-03 is a Tuesday.
    expect(describeDraft(draft, refs, letterOf, '2031-06-03')).toBe(
      '2× a week · weeks start Tuesday · A → B',
    )
  })

  it('names no workout when there is only one', () => {
    const draft = { ...emptyScheduleDraft(), days: [{ weekday: 2, workout: null }] }
    expect(describeDraft(draft, [57], letterOf)).toBe('Tue')
  })

  it('is nothing while no day is ticked', () => {
    expect(describeDraft(emptyScheduleDraft(), refs, letterOf)).toBeNull()
  })
})