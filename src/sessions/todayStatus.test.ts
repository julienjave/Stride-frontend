import { describe, it, expect } from 'vitest'
import type { CountedWeek, DatedAttempt, ScheduleSummary, ScheduledDay } from '@/assigned-programs/types'
import { todayStatus } from './todayStatus'

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

function stopped(date: string, endReason: DatedAttempt['endReason'], sessionId = 90): DatedAttempt {
  return { sessionId, date, status: 'incomplete', endReason }
}

// --- TODAY -------------------------------------------------------------------------

describe('todayStatus — a session in progress', () => {
  it('says a session of today is in progress, before anything else', () => {
    // Even on a day already done and paused: an open session is what the
    // patient is in the middle of.
    expect(
      todayStatus(
        summary({
          openSession: { sessionId: 5, localDate: TODAY, workoutId: B },
          days: [day(TODAY, 'done')],
          pauses: [{ from: '2031-06-01', to: null }],
        }),
        TODAY,
      ),
    ).toStrictEqual({ kind: 'in_progress', workoutId: B, sessionId: 5 })
  })

  it("ignores a session left open on an earlier day — today's own plan shows", () => {
    expect(
      todayStatus(
        summary({
          openSession: { sessionId: 5, localDate: '2031-06-11', workoutId: B },
          days: [day(TODAY, 'due')],
        }),
        TODAY,
      ),
    ).toStrictEqual({ kind: 'due', workoutId: A, stopped: [] })
  })
})

describe('todayStatus — a pause', () => {
  it.each<[string, { from: string; to: string | null }, boolean]>([
    ['started earlier, nothing ends it', { from: '2031-06-01', to: null }, true],
    ['ends today', { from: '2031-06-01', to: TODAY }, true],
    ['starts today', { from: TODAY, to: '2031-06-20' }, true],
    ['ended yesterday', { from: '2031-06-01', to: '2031-06-11' }, false],
    ['starts tomorrow', { from: '2031-06-13', to: null }, false],
  ])('a pause that %s', (_label, pause, paused) => {
    const status = todayStatus(summary({ pauses: [pause], days: [day(TODAY, 'due')] }), TODAY)
    expect(status?.kind).toBe(paused ? 'paused' : 'due')
  })
})

describe('todayStatus — a scheduled day', () => {
  it.each(['done', 'done_early', 'swapped', 'made_up'] as const)(
    'says a day %s is done for today',
    (state) => {
      expect(todayStatus(summary({ days: [day(TODAY, state)] }), TODAY)).toStrictEqual({
        kind: 'done',
      })
    },
  )

  it("names the day's workout when it's still to do", () => {
    expect(
      todayStatus(summary({ days: [day('2031-06-09', 'done'), day(TODAY, 'due', { workoutId: B })] }), TODAY),
    ).toStrictEqual({ kind: 'due', workoutId: B, stopped: [] })
  })

  it('says a skipped day was skipped, with its reason — not "to do"', () => {
    expect(
      todayStatus(
        summary({
          days: [
            day(TODAY, 'due', {
              attempts: [{ sessionId: 7, status: 'skipped', endReason: 'illness' }],
            }),
          ],
        }),
        TODAY,
      ),
    ).toStrictEqual({ kind: 'skipped', reason: 'illness' })
  })

  it('remembers sessions stopped today, oldest first — the day is still to do', () => {
    expect(
      todayStatus(
        summary({
          days: [
            day(TODAY, 'due', {
              attempts: [
                { sessionId: 7, status: 'incomplete', endReason: 'pain' },
                { sessionId: 8, status: 'incomplete', endReason: 'no_time' },
              ],
            }),
          ],
        }),
        TODAY,
      ),
    ).toStrictEqual({ kind: 'due', workoutId: A, stopped: ['pain', 'no_time'] })
  })

  it("shows nothing for a state today can't have rather than guess", () => {
    expect(todayStatus(summary({ days: [day(TODAY, 'upcoming')] }), TODAY)).toBeNull()
  })
})

describe('todayStatus — an "N a week" program', () => {
  it("names the week's next OPEN slot, how far the week is, and its dates", () => {
    expect(todayStatus(summary({ weeks: [week()] }), TODAY)).toStrictEqual({
      kind: 'weekly',
      // B: the first slot with no session — not the first slot (A, done).
      workoutId: B,
      done: 1,
      target: 3,
      start: '2031-06-09',
      end: '2031-06-15',
      stopped: [],
    })
  })

  it('counts the weeks whose first or last day is today', () => {
    for (const edge of [
      { start: TODAY, end: '2031-06-18' },
      { start: '2031-06-06', end: TODAY },
    ]) {
      expect(todayStatus(summary({ weeks: [week(edge)] }), TODAY)?.kind).toBe('weekly')
    }
  })

  it('says done for today once a slot was filled TODAY — a second session would count for nothing', () => {
    const doneToday = week({
      workouts: [
        { workoutId: A, sessionId: 21, date: '2031-06-10' },
        { workoutId: B, sessionId: 22, date: TODAY },
        { workoutId: A, sessionId: null, date: null },
      ],
      done: 2,
    })
    expect(todayStatus(summary({ weeks: [doneToday] }), TODAY)).toStrictEqual({ kind: 'done' })
  })

  it("says the week's target is reached", () => {
    const met = week({
      target: 2,
      workouts: [
        { workoutId: A, sessionId: 21, date: '2031-06-10' },
        { workoutId: B, sessionId: 22, date: '2031-06-11' },
      ],
      done: 2,
      state: 'met',
    })
    expect(todayStatus(summary({ weeks: [met] }), TODAY)).toStrictEqual({
      kind: 'week_met',
      target: 2,
    })
  })

  it('says nothing for a week scaled down to a target of 0', () => {
    // A one-day last stretch of "3 a week": round(3 × 1 / 7) = 0. The
    // summary calls it met (0 of 0); nothing is asked.
    const nothingAsked = week({ start: TODAY, end: TODAY, target: 0, workouts: [], done: 0, state: 'met' })
    expect(todayStatus(summary({ weeks: [nothingAsked] }), TODAY)).toBeNull()
  })

  it("remembers a session stopped today in the week — not one stopped another day", () => {
    const status = todayStatus(
      summary({
        weeks: [week({ attempts: [stopped('2031-06-11', 'other', 1), stopped(TODAY, 'pain', 2)] })],
      }),
      TODAY,
    )
    expect(status).toMatchObject({ kind: 'weekly', stopped: ['pain'] })
  })
})

describe('todayStatus — catching up on a free day', () => {
  it("names the missed day and its workout while its window is open", () => {
    expect(
      todayStatus(
        summary({
          days: [day('2031-06-11', 'due', { workoutId: B }), day('2031-06-13', 'upcoming')],
          nextWorkout: { workoutId: B, forDay: '2031-06-11', programWeek: null },
        }),
        TODAY,
      ),
    ).toStrictEqual({ kind: 'catch_up', workoutId: B, forDay: '2031-06-11', stopped: [] })
  })

  it('remembers a catch-up stopped today (filed apart: a free day)', () => {
    const status = todayStatus(
      summary({
        nextWorkout: { workoutId: B, forDay: '2031-06-11', programWeek: null },
        otherAttempts: [stopped(TODAY, 'no_time')],
      }),
      TODAY,
    )
    expect(status).toMatchObject({ kind: 'catch_up', stopped: ['no_time'] })
  })

  it.each<[string, ScheduleSummary['nextWorkout']]>([
    ['a later day is next', { workoutId: A, forDay: '2031-06-13', programWeek: null }],
    ["a week's count is next", { workoutId: A, forDay: null, programWeek: 3 }],
    ['nothing is next', null],
  ])('says nothing on a free day when %s', (_label, nextWorkout) => {
    expect(todayStatus(summary({ nextWorkout }), TODAY)).toBeNull()
  })
})