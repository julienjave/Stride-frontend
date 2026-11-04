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
  canMoveStart,
  earliestEndDate,
  endChangeNotes,
  endDateProblem,
  startDateProblem,
  startMoveNotes,
  versionInForceOn,
  type ProgramDates,
} from './dateChange'
import { workoutNames } from './programSchedule'
import type { ScheduleVersion } from './types'

// 2031-06-03 is a Tuesday: program weeks run Tuesday to Monday —
// week 1 = 3–9 June, week 2 = 10–16, week 3 = 17–23, week 4 = 24–30.
// Clocks pinned in 2031, far from today (the 2026-10-10 lesson).
const START = '2031-06-03'
const BEFORE_START = '2031-05-20'
// Dates in the notes are pinned to one locale so the expected strings can be
// written out in full ("Tue 3 Jun").
const LOCALE = 'en-GB'

function version(id: number, effectiveFrom: string, fields: Partial<ScheduleVersion> = {}) {
  return {
    id,
    assignedProgramId: 12,
    type: 'weekdays',
    timesPerWeek: null,
    effectiveFrom,
    createdBy: 3,
    createdAt: `${effectiveFrom}T08:00:00.000Z`,
    days: [
      { weekday: 2, workoutId: 57 },
      { weekday: 4, workoutId: 58 },
    ],
    rotation: [],
    ...fields,
  } satisfies ScheduleVersion
}

const PAUSED = { type: 'paused' as const, days: [] }
const perWeek = (n: number) => ({
  type: 'times_per_week' as const,
  timesPerWeek: n,
  days: [],
  rotation: [57, 58],
})

const NAMES = workoutNames([
  { id: 57, assignedProgramId: 12, name: 'Mobility', sortOrder: 0 },
  { id: 58, assignedProgramId: 12, name: 'Strength', sortOrder: 1 },
])

function program(fields: Partial<ProgramDates> = {}): ProgramDates {
  return { startDate: START, endDate: null, schedules: [version(1, START)], ...fields }
}

// --- WHEN ------------------------------------------------------------------------------------------

describe('canMoveStart', () => {
  it('allows it before the start, and ON the start day (nothing judged yet)', () => {
    expect(canMoveStart(program(), BEFORE_START)).toBe(true)
    expect(canMoveStart(program(), START)).toBe(true)
  })

  it('refuses it from the day after the start', () => {
    expect(canMoveStart(program(), '2031-06-04')).toBe(false)
  })
})

describe('earliestEndDate', () => {
  it('is the start before the program has begun, today once it runs', () => {
    expect(earliestEndDate(program(), BEFORE_START)).toBe(START)
    expect(earliestEndDate(program(), '2031-06-12')).toBe('2031-06-12')
  })
})

describe('versionInForceOn', () => {
  const versions = [version(1, START), version(2, '2031-06-17')]

  it('is the latest version starting on or before the day', () => {
    expect(versionInForceOn(versions, '2031-06-10')?.id).toBe(1)
    expect(versionInForceOn(versions, '2031-06-17')?.id).toBe(2)
    expect(versionInForceOn(versions, '2031-06-20')?.id).toBe(2)
  })

  // A start moved EARLIER: no version starts yet — the first one is the
  // one brought forward (the backend's planStartDateMove).
  it('is the first version for a day before every version', () => {
    expect(versionInForceOn(versions, BEFORE_START)?.id).toBe(1)
  })

  it('is none without versions', () => {
    expect(versionInForceOn([], START)).toBeNull()
  })
})

// --- WHAT'S WRONG ----------------------------------------------------------------------------------

describe('startDateProblem', () => {
  // Ends Monday 30 June; paused from 17 June, resumed from 24 June.
  const planned = program({
    endDate: '2031-06-30',
    schedules: [version(1, START), version(2, '2031-06-17', PAUSED), version(3, '2031-06-24')],
  })
  const problem = (day: string) => startDateProblem(day, planned, BEFORE_START, LOCALE)

  it('asks for a date when there is none', () => {
    expect(problem('')).toBe('Choose a start date')
    expect(problem('2031-02-30')).toBe('Choose a start date')
  })

  it('refuses the past, and accepts today', () => {
    expect(problem('2031-05-19')).toBe(
      "The start date can't be moved into the past: choose today or later",
    )
    expect(problem(BEFORE_START)).toBeNull()
  })

  it('refuses a day after the end — saying what to do — and accepts the end day itself', () => {
    expect(problem('2031-07-01')).toBe(
      'The program ends on Mon 30 Jun: choose that day or earlier, or move the end date first',
    )
    expect(problem('2031-06-30')).toBeNull()
  })

  it('refuses a day inside a planned pause, from its first day, and accepts the resume', () => {
    const paused = "A program can't start paused: the new start date falls in a planned pause"
    expect(problem('2031-06-17')).toBe(paused)
    expect(problem('2031-06-20')).toBe(paused)
    expect(problem('2031-06-16')).toBeNull()
    expect(problem('2031-06-24')).toBeNull()
  })

  // The backend's order: the dates' order before the pause. A day after the
  // end AND in a pause that runs past it gets the end's message.
  it('names the end before a pause', () => {
    const pausedToTheEnd = program({
      endDate: '2031-06-30',
      schedules: [version(1, START), version(2, '2031-06-17', PAUSED)],
    })
    expect(startDateProblem('2031-07-05', pausedToTheEnd, BEFORE_START, LOCALE)).toBe(
      'The program ends on Mon 30 Jun: choose that day or earlier, or move the end date first',
    )
  })
})

describe('endDateProblem', () => {
  const running = '2031-06-12'

  it('accepts no end date at all', () => {
    expect(endDateProblem('', program(), running)).toBeNull()
  })

  it('asks for a date when the text is not one', () => {
    expect(endDateProblem('2031-06-31', program(), running)).toBe('Choose an end date')
  })

  it('refuses the past, and accepts today', () => {
    expect(endDateProblem('2031-06-11', program(), running)).toBe(
      "The end date can't be moved into the past: to end the program now, complete or cancel it",
    )
    expect(endDateProblem(running, program(), running)).toBeNull()
  })

  // Before the start AND in the past: the backend's more basic explanation
  // first.
  it('names an end before the start first', () => {
    expect(endDateProblem('2031-06-02', program(), running)).toBe(
      "The end date can't be before the start date",
    )
  })

  // A program that hasn't started: a day between today and the start is
  // not in the past — it's before the start.
  it('refuses a day before a future start, which is not in the past', () => {
    expect(endDateProblem('2031-05-25', program(), BEFORE_START)).toBe(
      "The end date can't be before the start date",
    )
    expect(endDateProblem(START, program(), BEFORE_START)).toBeNull()
  })
})

// --- WHAT SAVING WOULD DO --------------------------------------------------------------------------

describe('startMoveNotes', () => {
  it('says nothing for the same day, or for a value that is not a date', () => {
    expect(startMoveNotes(program(), START, NAMES, LOCALE)).toStrictEqual([])
    expect(startMoveNotes(program(), '', NAMES, LOCALE)).toStrictEqual([])
  })

  it('moves the first schedule earlier with the start', () => {
    expect(startMoveNotes(program(), '2031-05-27', NAMES, LOCALE)).toStrictEqual([
      { text: 'The schedule moves with it:', items: ['From Tue 27 May: Tue A · Thu B'] },
    ])
  })

  // The first version, then "3 a week" planned from 10 June (a Tuesday).
  const withPlannedChange = program({
    schedules: [version(1, START), version(2, '2031-06-10', perWeek(3))],
  })

  // Later, but before the planned change: the first version is the one in
  // force — it moves; it is NOT listed as dropped, and the planned change
  // stays (nothing said about it).
  it('keeps a planned change that starts after the new start', () => {
    expect(startMoveNotes(withPlannedChange, '2031-06-05', NAMES, LOCALE)).toStrictEqual([
      { text: 'The schedule moves with it:', items: ['From Thu 5 Jun: Tue A · Thu B'] },
    ])
  })

  // Past the planned change: the program will START with it — and its
  // program weeks will start on the new start's weekday (Thursday), which
  // the words say. The first version will never apply.
  it('starts with the version in force that day, and says what will never apply', () => {
    expect(startMoveNotes(withPlannedChange, '2031-06-12', NAMES, LOCALE)).toStrictEqual([
      {
        text: 'The schedule moves with it:',
        items: ['From Thu 12 Jun: 3× a week · weeks start Thursday · A → B'],
      },
      {
        text: 'What was set to begin before that day will never apply:',
        items: ['From Tue 3 Jun: Tue A · Thu B'],
      },
    ])
  })

  it('takes a version starting exactly on the new day as the one in force', () => {
    expect(startMoveNotes(withPlannedChange, '2031-06-10', NAMES, LOCALE)).toStrictEqual([
      {
        text: 'The schedule moves with it:',
        items: ['From Tue 10 Jun: 3× a week · weeks start Tuesday · A → B'],
      },
      {
        text: 'What was set to begin before that day will never apply:',
        items: ['From Tue 3 Jun: Tue A · Thu B'],
      },
    ])
  })

  it('counts several versions that will never apply', () => {
    const three = program({
      schedules: [version(1, START), version(2, '2031-06-06', PAUSED), version(3, '2031-06-10')],
    })
    expect(startMoveNotes(three, '2031-06-12', NAMES, LOCALE)[1]).toStrictEqual({
      text: 'The 2 versions set to begin before that day will never apply:',
      items: ['From Tue 3 Jun: Tue A · Thu B', 'From Fri 6 Jun: Paused'],
    })
  })
})

describe('endChangeNotes', () => {
  // 3 a week, ending Monday 30 June — the last day of week 4.
  const threeAWeek = program({ endDate: '2031-06-30', schedules: [version(1, START, perWeek(3))] })
  const notes = (p: ProgramDates, end: string | null) => endChangeNotes(p, end, NAMES, LOCALE)

  it('says nothing when the end moves later, stays, or goes', () => {
    expect(notes(threeAWeek, '2031-07-07')).toStrictEqual([])
    expect(notes(threeAWeek, '2031-06-30')).toStrictEqual([])
    expect(notes(threeAWeek, null)).toStrictEqual([])
  })

  it('says nothing for an end on the last day of a program week', () => {
    expect(notes(threeAWeek, '2031-06-23')).toStrictEqual([])
  })

  it('scales the target of a last week cut short', () => {
    expect(notes(threeAWeek, '2031-06-19')).toStrictEqual([
      {
        text: 'The last program week will be Tue 17 Jun – Thu 19 Jun (3 days), so its target becomes 1 session instead of 3.',
        items: [],
      },
    ])
  })

  // round(3 × 6 / 7) = round(2.57) = 3: one day fewer doesn't change it.
  it('says nothing when the rounded target stays the same', () => {
    expect(notes(threeAWeek, '2031-06-22')).toStrictEqual([])
  })

  it('says when no session will be expected in the last week', () => {
    expect(notes(threeAWeek, '2031-06-17')).toStrictEqual([
      {
        text: 'The last program week will be Tue 17 Jun – Tue 17 Jun (1 day), so no session will be expected that week (instead of 3).',
        items: [],
      },
    ])
  })

  it('counts sessions in the plural', () => {
    const fiveAWeek = program({ endDate: '2031-06-30', schedules: [version(1, START, perWeek(5))] })
    expect(notes(fiveAWeek, '2031-06-20')[0].text).toBe(
      'The last program week will be Tue 17 Jun – Fri 20 Jun (4 days), so its target becomes 3 sessions instead of 5.',
    )
  })

  // The old end was already inside that week (Saturday 21: 5 days, target
  // round(15/7) = 2) — "instead of" is THAT target, not a full week's 3.
  it("compares with the target the week had, when the old end was in it", () => {
    const endsSaturday = program({ endDate: '2031-06-21', schedules: [version(1, START, perWeek(3))] })
    expect(notes(endsSaturday, '2031-06-18')[0].text).toBe(
      'The last program week will be Tue 17 Jun – Wed 18 Jun (2 days), so its target becomes 1 session instead of 2.',
    )
  })

  // "3 a week" from Thursday 19 June, in the middle of week 3: that week is
  // already split, and its "3 a week" part runs Thursday → Monday (5 days,
  // target 2). Cut on Friday: Thursday → Friday, 2 days, target 1. (Counted
  // from the week's Tuesday instead, it would read "2 instead of 3".)
  it('scales the part of the week the version covers, when it began mid-week', () => {
    const changedMidWeek = program({
      endDate: '2031-06-30',
      schedules: [version(1, START), version(2, '2031-06-19', perWeek(3))],
    })
    expect(notes(changedMidWeek, '2031-06-20')).toStrictEqual([
      {
        text: 'The last program week will be Tue 17 Jun – Fri 20 Jun (4 days), so its target becomes 1 session instead of 2.',
        items: [],
      },
    ])
  })

  // An open-ended program given an end: it SHORTENS (every day after it is
  // cut off). The "3 a week" part of week 3 ended on Friday 20, the day
  // before a weekdays version planned from Saturday 21 (4 days, target 2)
  // — that version will never apply.
  it('gives an open-ended program an end: the planned change after it, and the split week', () => {
    const openEnded = program({
      schedules: [version(1, START, perWeek(3)), version(2, '2031-06-21')],
    })
    expect(notes(openEnded, '2031-06-18')).toStrictEqual([
      {
        text: 'The change planned after that day will never apply:',
        items: ['From Sat 21 Jun: Tue A · Thu B'],
      },
      {
        text: 'The last program week will be Tue 17 Jun – Wed 18 Jun (2 days), so its target becomes 1 session instead of 2.',
        items: [],
      },
    ])
  })

  // A version starting ON the new end still applies — to that one day.
  it('keeps a version starting on the new end day, and counts the ones after it', () => {
    const planned = program({
      endDate: '2031-06-30',
      schedules: [
        version(1, START),
        version(2, '2031-06-19', PAUSED),
        version(3, '2031-06-24'),
        version(4, '2031-06-27', PAUSED),
      ],
    })
    expect(notes(planned, '2031-06-19')).toStrictEqual([
      {
        text: 'The 2 changes planned after that day will never apply:',
        items: ['From Tue 24 Jun: Tue A · Thu B', 'From Fri 27 Jun: Paused'],
      },
    ])
  })

  // Specific days or a pause: no target to scale — only "fewer days".
  it('scales nothing for specific days, or during a pause', () => {
    expect(notes(program({ endDate: '2031-06-30' }), '2031-06-19')).toStrictEqual([])
    const pausedThen = program({
      endDate: '2031-06-30',
      schedules: [version(1, START, perWeek(3)), version(2, '2031-06-17', PAUSED)],
    })
    expect(notes(pausedThen, '2031-06-19')).toStrictEqual([])
  })
})