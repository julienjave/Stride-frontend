import { describe, it, expect } from 'vitest'
import type {
  AssignedProgramListItem,
  CountedWeek,
  ScheduleSummary,
  ScheduledDay,
} from '@/assigned-programs/types'
import { UPCOMING_DAYS, upcomingItems } from './patientHomeRules'

// "Today" is Thursday 12 June 2031 — far from the real today, so no rule
// can pass by reading the clock instead of its argument.
const TODAY = '2031-06-12'
const A = 57
const B = 58

function day(
  date: string,
  state: ScheduledDay['state'],
  fields: Partial<ScheduledDay> = {},
): ScheduledDay {
  return {
    date,
    workoutId: A,
    state,
    sessionId: null,
    madeUpBy: null,
    madeUpLateBy: null,
    doneEarlyBy: null,
    swappedBy: null,
    attempts: [],
    ...fields,
  }
}

// A weekly stretch Mon 9 – Sun 15 June, 3 a week (A, B, A), one done on
// Tuesday.
function week(fields: Partial<CountedWeek> = {}): CountedWeek {
  return {
    programWeek: 2,
    start: '2031-06-09',
    end: '2031-06-15',
    timesPerWeek: 3,
    target: 3,
    workouts: [
      { workoutId: A, sessionId: 21, date: '2031-06-10' },
      { workoutId: B, sessionId: null, date: null },
      { workoutId: A, sessionId: null, date: null },
    ],
    done: 1,
    state: 'in_progress',
    sessionIds: [21],
    attempts: [],
    ...fields,
  }
}

function summary(fields: Partial<ScheduleSummary> = {}): ScheduleSummary {
  return {
    firstDay: '2031-06-02',
    lastDay: '2031-06-22',
    today: TODAY,
    totals: {
      expected: null,
      done: 0,
      madeUp: 0,
      madeUpLate: 0,
      doneEarly: 0,
      swapped: 0,
      missed: 0,
      extra: 0,
      skipped: 0,
      incomplete: 0,
    },
    days: [],
    weeks: [],
    extraSessions: [],
    otherAttempts: [],
    pauses: [],
    nextWorkout: null,
    openSession: null,
    lateMakeUps: { days: [], blockedToday: null },
    ...fields,
  }
}


// --- WHICH PROGRAMS --------------------------------------------------------------

function program(id: number, fields: Partial<AssignedProgramListItem> = {}): AssignedProgramListItem {
  return {
    id,
    patientId: 6,
    assignedBy: 3,
    basedOnTemplateId: null,
    basedOnProgramId: null,
    title: `Program ${id}`,
    startDate: '2031-06-02',
    endDate: null,
    status: 'active',
    isArchived: false,
    allowSwaps: true,
    lateMakeUpDays: null,
    schedules: [],
    assigner: { id: 3, firstName: 'Alex', lastName: 'Chen' },
    workouts: [],
    ...fields,
  }
}

// --- UPCOMING ----------------------------------------------------------------------

describe('upcomingItems', () => {
  it('lists the soonest scheduled days across programs, the programs in order on a tie', () => {
    const items = upcomingItems(
      [
        {
          program: program(1),
          summary: summary({
            days: [
              day(TODAY, 'due'),
              day('2031-06-13', 'upcoming'),
              day('2031-06-16', 'upcoming', { workoutId: B }),
            ],
          }),
        },
        {
          program: program(2),
          summary: summary({
            days: [day('2031-06-11', 'done'), day('2031-06-13', 'upcoming'), day('2031-06-14', 'upcoming')],
          }),
        },
      ],
      TODAY,
    )
    expect(items).toStrictEqual([
      { kind: 'day', programId: 1, date: '2031-06-13', workoutId: A },
      { kind: 'day', programId: 2, date: '2031-06-13', workoutId: A },
      { kind: 'day', programId: 2, date: '2031-06-14', workoutId: A },
      { kind: 'day', programId: 1, date: '2031-06-16', workoutId: B },
    ])
  })

  it('leaves out a later day already done (ahead of time, or by a swap)', () => {
    const items = upcomingItems(
      [
        {
          program: program(1),
          summary: summary({
            days: [day('2031-06-13', 'done_early'), day('2031-06-16', 'swapped'), day('2031-06-18', 'upcoming')],
          }),
        },
      ],
      TODAY,
    )
    expect(items).toStrictEqual([{ kind: 'day', programId: 1, date: '2031-06-18', workoutId: A }])
  })

  it(`lists at most ${UPCOMING_DAYS} days`, () => {
    const days = ['13', '14', '15', '16', '17'].map((n) => day(`2031-06-${n}`, 'upcoming'))
    const items = upcomingItems([{ program: program(1), summary: summary({ days }) }], TODAY)
    expect(items.map((item) => ('date' in item ? item.date : null))).toStrictEqual([
      '2031-06-13',
      '2031-06-14',
      '2031-06-15',
      '2031-06-16',
    ])
  })

  it('says how many more the current week needs AFTER today — today offered in Today', () => {
    // 3 a week, 1 done (Tuesday), nothing today: today's session is in
    // Today, so 1 more after it.
    expect(
      upcomingItems([{ program: program(1), summary: summary({ weeks: [week()] }) }], TODAY),
    ).toStrictEqual([{ kind: 'week_rest', programId: 1, remaining: 1, end: '2031-06-15' }])
  })

  it('counts every missing session when one was already done today', () => {
    const doneToday = week({
      target: 4,
      workouts: [
        { workoutId: A, sessionId: 21, date: TODAY },
        { workoutId: B, sessionId: null, date: null },
        { workoutId: A, sessionId: null, date: null },
        { workoutId: B, sessionId: null, date: null },
      ],
      done: 1,
    })
    expect(
      upcomingItems([{ program: program(1), summary: summary({ weeks: [doneToday] }) }], TODAY),
    ).toStrictEqual([{ kind: 'week_rest', programId: 1, remaining: 3, end: '2031-06-15' }])
  })

  it('says nothing for a week with nothing left after today, or already met', () => {
    const lastOne = week({ target: 2, done: 1, workouts: week().workouts.slice(0, 2) })
    const met = week({ state: 'met', done: 3 })
    for (const stretch of [lastOne, met]) {
      expect(
        upcomingItems([{ program: program(1), summary: summary({ weeks: [stretch] }) }], TODAY),
      ).toStrictEqual([])
    }
  })

  it('says when a weekly program that has not started begins, and how often', () => {
    const notStarted = program(1, { startDate: '2031-06-16' })
    const first = week({ programWeek: 1, start: '2031-06-16', end: '2031-06-22', state: 'upcoming', done: 0 })
    expect(
      upcomingItems([{ program: notStarted, summary: summary({ weeks: [first] }) }], TODAY),
    ).toStrictEqual([{ kind: 'week_start', programId: 1, start: '2031-06-16', timesPerWeek: 3 }])
  })

  it("says nothing of a started weekly program between its weeks (a pause), nor of one whose first week isn't weekly", () => {
    const paused = summary({
      weeks: [week({ start: '2031-06-02', end: '2031-06-08', state: 'met' })],
      pauses: [{ from: '2031-06-09', to: null }],
    })
    const startsWithDays = summary({
      days: [day('2031-06-16', 'upcoming')],
      weeks: [week({ start: '2031-06-23', end: '2031-06-29', state: 'upcoming' })],
    })
    expect(upcomingItems([{ program: program(1), summary: paused }], TODAY)).toStrictEqual([])
    expect(
      upcomingItems(
        [{ program: program(2, { startDate: '2031-06-16' }), summary: startsWithDays }],
        TODAY,
      ),
    ).toStrictEqual([{ kind: 'day', programId: 2, date: '2031-06-16', workoutId: A }])
  })

  it('puts the weekly lines after the dated days', () => {
    const items = upcomingItems(
      [
        { program: program(1), summary: summary({ weeks: [week()] }) },
        { program: program(2), summary: summary({ days: [day('2031-06-20', 'upcoming')] }) },
      ],
      TODAY,
    )
    expect(items.map((item) => item.kind)).toStrictEqual(['day', 'week_rest'])
  })

  // (Split from the matching todayStatus test when that rule moved to
  // src/sessions/, 2026-10-16.) A one-day last stretch of "3 a week" scaled
  // to a target of 0 asks nothing — Upcoming says nothing of it either.
  it('says nothing for a week scaled down to a target of 0', () => {
    const nothingAsked = week({ start: TODAY, end: TODAY, target: 0, workouts: [], done: 0, state: 'met' })
    expect(
      upcomingItems([{ program: program(1), summary: summary({ weeks: [nothingAsked] }) }], TODAY),
    ).toStrictEqual([])
  })
})