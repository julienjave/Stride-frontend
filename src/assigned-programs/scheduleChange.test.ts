import { describe, it, expect } from 'vitest'
import { formatShortDate } from '@/common/calendarDate'
import { workoutNames } from './programSchedule'
import {
  changeWindow,
  nextProgramWeekStart,
  replacedText,
  replacedVersions,
  scheduleChangeProblems,
  startingDraft,
  toScheduleVersionInput,
} from './scheduleChange'
import { emptyScheduleDraft, type ScheduleDraft } from './scheduleDraft'
import type { ScheduleVersion } from './types'

// 2031-06-03 is a Tuesday: program weeks run Tuesday to Monday.
const START = '2031-06-03'
const OPEN_ENDED = { startDate: START, endDate: null }
const IDS = [57, 58]

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
const NAMES = workoutNames([
  { id: 57, assignedProgramId: 12, name: 'Mobility', sortOrder: 0 },
  { id: 58, assignedProgramId: 12, name: 'Strength', sortOrder: 1 },
])

describe('changeWindow', () => {
  it('starts today in a running program, with no last day when open-ended', () => {
    expect(changeWindow(OPEN_ENDED, '2031-06-12', 'change')).toStrictEqual({
      earliest: '2031-06-12',
      latest: null,
    })
  })

  it('starts on the start date before the program has begun — a pause the day after', () => {
    expect(changeWindow(OPEN_ENDED, '2031-05-20', 'change')?.earliest).toBe(START)
    expect(changeWindow(OPEN_ENDED, '2031-05-20', 'resume')?.earliest).toBe(START)
    expect(changeWindow(OPEN_ENDED, '2031-05-20', 'pause')?.earliest).toBe('2031-06-04')
    // On the start date itself, too: the program can't start paused.
    expect(changeWindow(OPEN_ENDED, START, 'pause')?.earliest).toBe('2031-06-04')
  })

  it('ends on the end date — and is none once that has passed', () => {
    const ending = { startDate: START, endDate: '2031-06-30' }
    expect(changeWindow(ending, '2031-06-30', 'change')).toStrictEqual({
      earliest: '2031-06-30',
      latest: '2031-06-30',
    })
    expect(changeWindow(ending, '2031-07-01', 'change')).toBeNull()
    // A one-day program can never be paused.
    expect(changeWindow({ startDate: START, endDate: START }, '2031-05-20', 'pause')).toBeNull()
  })
})

describe('nextProgramWeekStart', () => {
  it("is the next day with the start date's weekday", () => {
    expect(nextProgramWeekStart(START, '2031-06-12')).toBe('2031-06-17') // Thu → Tue
    expect(nextProgramWeekStart(START, '2031-06-16')).toBe('2031-06-17') // Mon → Tue
    expect(nextProgramWeekStart(START, '2031-06-11')).toBe('2031-06-17') // Wed → Tue (6 days)
  })

  it('is none when the day already starts a program week', () => {
    expect(nextProgramWeekStart(START, '2031-06-10')).toBeNull()
  })
})

describe('replacedVersions / replacedText', () => {
  const versions = [
    version(1, START),
    version(2, '2031-06-17', { type: 'times_per_week', timesPerWeek: 3, days: [], rotation: [57, 58] }),
    version(3, '2031-06-24', PAUSED),
  ]

  it('replaces every version from that day on — the same day included, earlier ones kept', () => {
    expect(replacedVersions(versions, '2031-06-12').map((v) => v.id)).toEqual([2, 3])
    expect(replacedVersions(versions, '2031-06-17').map((v) => v.id)).toEqual([2, 3])
    expect(replacedVersions(versions, '2031-06-18').map((v) => v.id)).toEqual([3])
    expect(replacedVersions(versions, '2031-06-25')).toEqual([])
  })

  it('words them, each with its day', () => {
    expect(replacedText(versions, '2031-06-12', NAMES, START)).toStrictEqual({
      heading: 'Saving replaces the 2 versions already set from that day on:',
      items: [
        `From ${formatShortDate('2031-06-17')}: 3× a week · weeks start Tuesday · A → B`,
        `From ${formatShortDate('2031-06-24')}: Paused`,
      ],
    })
    expect(replacedText(versions, '2031-06-20', NAMES, START)).toStrictEqual({
      heading: 'Saving replaces what was already set from that day on:',
      items: [`From ${formatShortDate('2031-06-24')}: Paused`],
    })
  })

  it('is none when nothing is replaced', () => {
    expect(replacedText(versions, '2031-06-25', NAMES, START)).toBeNull()
  })
})

describe('startingDraft', () => {
  it('starts from the schedule in force today — not from a planned change', () => {
    const versions = [
      version(1, START),
      version(2, '2031-06-20', { days: [{ weekday: 1, workoutId: 58 }] }),
    ]
    expect(startingDraft(versions, IDS, '2031-06-12')).toStrictEqual({
      ...emptyScheduleDraft(),
      days: [
        { weekday: 2, workout: 57 },
        { weekday: 4, workout: 58 },
      ],
    })
  })

  it('while paused, starts from the last real schedule before the pause', () => {
    const versions = [
      version(1, START),
      version(2, '2031-06-10', { days: [{ weekday: 5, workoutId: 58 }] }),
      version(3, '2031-06-11', PAUSED),
    ]
    expect(startingDraft(versions, IDS, '2031-06-12').days).toEqual([{ weekday: 5, workout: 58 }])
  })

  it("keeps an edited rotation, and gives a workout the program doesn't have to the suggestion", () => {
    const perWeek = version(1, START, {
      type: 'times_per_week',
      timesPerWeek: 2,
      days: [],
      rotation: [58, 57, 58],
    })
    expect(startingDraft([perWeek], IDS, '2031-06-12')).toStrictEqual({
      ...emptyScheduleDraft(),
      type: 'times_per_week',
      timesPerWeek: 2,
      rotation: [58, 57, 58],
    })
    const gone = version(1, START, { days: [{ weekday: 2, workoutId: 99 }] })
    expect(startingDraft([gone], IDS, '2031-06-12').days).toEqual([{ weekday: 2, workout: null }])
  })

  it('is a new draft when only pauses are in force', () => {
    expect(startingDraft([version(1, START, PAUSED)], IDS, '2031-06-12')).toStrictEqual(
      emptyScheduleDraft(),
    )
  })
})

describe('scheduleChangeProblems', () => {
  const ticked: ScheduleDraft = { ...emptyScheduleDraft(), days: [{ weekday: 2, workout: null }] }
  const ending = { startDate: START, endDate: '2031-06-30' }
  const fromProblem = (kind: 'change' | 'pause', from: string, today = '2031-06-12') =>
    scheduleChangeProblems(kind, from, ticked, ending, today).from

  it('accepts an allowed day and a ticked schedule', () => {
    expect(scheduleChangeProblems('change', '2031-06-12', ticked, ending, '2031-06-12')).toStrictEqual({})
  })

  it("explains each day the backend would refuse — the program's dates first", () => {
    expect(fromProblem('change', '')).toBe('Choose a day')
    expect(fromProblem('change', '2031-02-30')).toBe('Choose a day')
    expect(fromProblem('change', '2031-06-02', '2031-05-01')).toBe(
      `The program starts on ${formatShortDate(START)}: choose that day or later`,
    )
    expect(fromProblem('change', '2031-07-01')).toBe(
      `The program ends on ${formatShortDate('2031-06-30')}: choose that day or earlier`,
    )
    expect(fromProblem('change', '2031-06-11')).toBe('That day has passed: choose today or later')
    // Before the start AND in the past: the program's date is the more
    // useful explanation.
    expect(fromProblem('change', '2031-06-01')).toMatch(/^The program starts on/)
  })

  it("refuses a pause on the start date — a change there is a correction, and fine", () => {
    expect(fromProblem('pause', START, '2031-05-01')).toBe(
      "A program can't start paused: choose a later day",
    )
    expect(fromProblem('change', START, '2031-05-01')).toBeUndefined()
  })

  it('needs a ticked day for specific days — not for N a week, nor for a pause', () => {
    const none = emptyScheduleDraft()
    expect(scheduleChangeProblems('change', '2031-06-12', none, ending, '2031-06-12')).toStrictEqual({
      schedule: 'Tick at least one day',
    })
    expect(
      scheduleChangeProblems('resume', '2031-06-12', none, ending, '2031-06-12').schedule,
    ).toBe('Tick at least one day')
    expect(
      scheduleChangeProblems('pause', '2031-06-12', none, ending, '2031-06-12'),
    ).toStrictEqual({})
    expect(
      scheduleChangeProblems(
        'change',
        '2031-06-12',
        { ...none, type: 'times_per_week' },
        ending,
        '2031-06-12',
      ),
    ).toStrictEqual({})
  })
})

describe('toScheduleVersionInput', () => {
  it('sends a pause as its day and type only — whatever the editor holds', () => {
    expect(
      toScheduleVersionInput('pause', '2031-06-20', { ...emptyScheduleDraft(), days: [{ weekday: 1, workout: 57 }] }, IDS),
    ).toStrictEqual({ effectiveFrom: '2031-06-20', type: 'paused' })
  })

  it('sends specific days with their workouts, a day left to the suggestion as the suggested one', () => {
    const draft: ScheduleDraft = {
      ...emptyScheduleDraft(),
      days: [
        { weekday: 1, workout: null },
        { weekday: 3, workout: null },
        { weekday: 5, workout: 57 },
      ],
    }
    expect(toScheduleVersionInput('change', '2031-06-12', draft, IDS)).toStrictEqual({
      effectiveFrom: '2031-06-12',
      type: 'weekdays',
      days: [
        { weekday: 1, workoutId: 57 },
        { weekday: 3, workoutId: 58 },
        { weekday: 5, workoutId: 57 },
      ],
    })
  })

  it('sends N a week without a rotation unless it was edited', () => {
    const draft: ScheduleDraft = { ...emptyScheduleDraft(), type: 'times_per_week', timesPerWeek: 2 }
    expect(toScheduleVersionInput('resume', '2031-06-12', draft, IDS)).toStrictEqual({
      effectiveFrom: '2031-06-12',
      type: 'times_per_week',
      timesPerWeek: 2,
    })
    expect(
      toScheduleVersionInput('change', '2031-06-12', { ...draft, rotation: [58, 57, 57] }, IDS),
    ).toStrictEqual({
      effectiveFrom: '2031-06-12',
      type: 'times_per_week',
      timesPerWeek: 2,
      rotation: [58, 57, 57],
    })
  })

  it('never sends a rotation for a one-workout program', () => {
    const draft: ScheduleDraft = {
      ...emptyScheduleDraft(),
      type: 'times_per_week',
      rotation: [57, 57],
    }
    expect(toScheduleVersionInput('change', '2031-06-12', draft, [57])).toStrictEqual({
      effectiveFrom: '2031-06-12',
      type: 'times_per_week',
      timesPerWeek: 3,
    })
  })
})