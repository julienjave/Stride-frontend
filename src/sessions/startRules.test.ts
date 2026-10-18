import { describe, it, expect } from 'vitest'
import type {
  AssignedProgramExercise,
  ScheduleSummary,
  ScheduledDay,
} from '@/assigned-programs/types'
import {
  sessionLeftOpen,
  skippableWorkout,
  startChoice,
  startChoiceFor,
  workoutExercises,
} from './startRules'

// "Today" is Thursday 12 June 2031 — far from the real today, so no rule
// can pass by reading the clock instead of its argument.
const TODAY = '2031-06-12'
const A = 57
const B = 58

function day(date: string, state: ScheduledDay['state'], workoutId = A): ScheduledDay {
  return {
    date,
    workoutId,
    state,
    sessionId: null,
    madeUpBy: null,
    madeUpLateBy: null,
    doneEarlyBy: null,
    swappedBy: null,
    attempts: [],
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

// The kinds themselves are todayStatus's (its own tests); these check what
// the start page and the home's button make of each.
describe('startChoice', () => {
  it("starts today's scheduled workout", () => {
    expect(startChoice(summary({ days: [day(TODAY, 'due', B)] }), TODAY)).toStrictEqual({
      kind: 'start',
      workoutId: B,
      status: { kind: 'due', workoutId: B, stopped: [] },
    })
  })

  it("starts the MISSED day's workout on a catch-up day", () => {
    const choice = startChoice(
      summary({
        days: [day('2031-06-11', 'due', B)],
        nextWorkout: { workoutId: B, forDay: '2031-06-11', programWeek: null, until: '2031-06-12' },
      }),
      TODAY,
    )
    expect(choice).toMatchObject({ kind: 'start', workoutId: B, status: { kind: 'catch_up' } })
  })

  it("starts the oldest late make-up's workout on a free day", () => {
    const choice = startChoice(
      summary({
        lateMakeUps: {
          days: [{ forDay: '2031-06-02', workoutId: B, until: '2031-06-14' }],
          blockedToday: null,
        },
      }),
      TODAY,
    )
    expect(choice).toMatchObject({
      kind: 'start',
      workoutId: B,
      status: { kind: 'late_make_up', forDay: '2031-06-02' },
    })
  })

  it("starts an \"N a week\" program's next open slot", () => {
    const choice = startChoice(
      summary({
        weeks: [
          {
            programWeek: 2,
            start: '2031-06-09',
            end: '2031-06-15',
            timesPerWeek: 2,
            target: 2,
            workouts: [
              { workoutId: A, sessionId: 21, date: '2031-06-10' },
              { workoutId: B, sessionId: null, date: null },
            ],
            done: 1,
            state: 'in_progress',
            sessionIds: [21],
            attempts: [],
          },
        ],
      }),
      TODAY,
    )
    expect(choice).toMatchObject({ kind: 'start', workoutId: B, status: { kind: 'weekly' } })
  })

  it("resumes a session open today — with that session's id", () => {
    expect(
      startChoice(
        summary({
          openSession: { sessionId: 31, localDate: TODAY, workoutId: A },
          days: [day(TODAY, 'due')],
        }),
        TODAY,
      ),
    ).toStrictEqual({ kind: 'resume', sessionId: 31 })
  })

  it.each<[string, Partial<ScheduleSummary>, string]>([
    ['done', { days: [day(TODAY, 'done')] }, 'done'],
    ['paused', { pauses: [{ from: '2031-06-01', to: null }], days: [day(TODAY, 'due')] }, 'paused'],
  ])('starts nothing when today is %s', (_label, fields, kind) => {
    expect(startChoice(summary(fields), TODAY)).toStrictEqual({ kind: 'none', status: { kind } })
  })

  it('starts nothing on a day that asks nothing', () => {
    expect(startChoice(summary({ days: [day('2031-06-13', 'upcoming')] }), TODAY)).toStrictEqual({
      kind: 'none',
      status: null,
    })
  })
})

describe('sessionLeftOpen', () => {
  it('finds a session left open on an earlier day', () => {
    const open = { sessionId: 31, localDate: '2031-06-09', workoutId: A }
    expect(sessionLeftOpen(summary({ openSession: open }), TODAY)).toStrictEqual(open)
  })

  // Today's open session is the one to resume, not a leftover.
  it("ignores today's open session, and no open session at all", () => {
    expect(
      sessionLeftOpen(summary({ openSession: { sessionId: 31, localDate: TODAY, workoutId: A } }), TODAY),
    ).toBeNull()
    expect(sessionLeftOpen(summary(), TODAY)).toBeNull()
  })
})

describe('workoutExercises', () => {
  function exercise(id: number, workoutId: number, sortOrder: number) {
    return { id, workoutId, sortOrder } as AssignedProgramExercise
  }

  it("keeps the workout's exercises only, in their order", () => {
    const exercises = [exercise(1, A, 1), exercise(2, B, 0), exercise(3, A, 0), exercise(4, A, 2)]
    expect(workoutExercises(exercises, A).map((row) => row.id)).toStrictEqual([3, 1, 4])
  })

  it('does not reorder the list it was given (the cached program)', () => {
    const exercises = [exercise(1, A, 1), exercise(3, A, 0)]
    workoutExercises(exercises, A)
    expect(exercises.map((row) => row.id)).toStrictEqual([1, 3])
  })
})

describe('skippableWorkout', () => {
  it("gives a due scheduled day's workout", () => {
    expect(skippableWorkout(summary({ days: [day(TODAY, 'due', B)] }), TODAY)).toBe(B)
  })

  // Every other "today": a catch-up day, a weekly program, a session open
  // or done, a pause — nothing the backend would let the patient skip.
  it.each<[string, Partial<ScheduleSummary>]>([
    ['a catch-up day', { days: [day('2031-06-11', 'due', B)], nextWorkout: { workoutId: B, forDay: '2031-06-11', programWeek: null, until: '2031-06-12' } }],
    ['done', { days: [day(TODAY, 'done')] }],
    ['open', { days: [day(TODAY, 'due')], openSession: { sessionId: 31, localDate: TODAY, workoutId: A } }],
    ['paused', { days: [day(TODAY, 'due')], pauses: [{ from: '2031-06-01', to: null }] }],
    ['a day with nothing', {}],
  ])('gives nothing on %s', (_label, fields) => {
    expect(skippableWorkout(summary(fields), TODAY)).toBeNull()
  })
})

// A start for a CHOSEN missed day (the Sessions hub's "Make it up", ?for=).
// The offers themselves are makeUps' (its own tests); these check what the
// start page makes of a day asked for.
describe('startChoiceFor', () => {
  // Free day today. Wednesday 11's B: on time, until Friday 13. Monday 2's
  // A and Wednesday 4's B: late — two late days, so a rule starting the
  // OLDEST instead of the one asked for gives a different answer.
  const MAKE_UPS = summary({
    days: [day('2031-06-02', 'missed', A), day('2031-06-04', 'missed', B), day('2031-06-11', 'due', B)],
    nextWorkout: { workoutId: B, forDay: '2031-06-11', programWeek: null, until: '2031-06-13' },
    lateMakeUps: {
      days: [
        { forDay: '2031-06-02', workoutId: A, until: '2031-06-14' },
        { forDay: '2031-06-04', workoutId: B, until: '2031-06-15' },
      ],
      blockedToday: null,
    },
  })

  it('starts the late make-up asked for — not the oldest — with its last day', () => {
    expect(startChoiceFor(MAKE_UPS, TODAY, '2031-06-04')).toStrictEqual({
      kind: 'start',
      workoutId: B,
      status: { kind: 'late_make_up', workoutId: B, forDay: '2031-06-04', until: '2031-06-15', stopped: [] },
    })
  })

  // Asked for while an on-time catch-up is open: allowed — the patient's
  // choice (decided 2026-10-17).
  it('starts a late one even while an on-time catch-up is open', () => {
    expect(startChoiceFor(MAKE_UPS, TODAY, '2031-06-02')).toMatchObject({
      kind: 'start',
      workoutId: A,
      status: { kind: 'late_make_up', forDay: '2031-06-02' },
    })
  })

  it('starts the on-time catch-up as a catch-up (no countsFor will be sent)', () => {
    expect(startChoiceFor(MAKE_UPS, TODAY, '2031-06-11')).toStrictEqual({
      kind: 'start',
      workoutId: B,
      status: { kind: 'catch_up', workoutId: B, forDay: '2031-06-11', stopped: [] },
    })
  })

  // A session stopped earlier today (on this free day): the start page says
  // it, as it does for today's own session.
  it('carries the sessions stopped earlier today', () => {
    const stopped = summary({
      ...MAKE_UPS,
      otherAttempts: [{ sessionId: 40, status: 'incomplete', endReason: 'pain', date: TODAY }],
    })
    expect(startChoiceFor(stopped, TODAY, '2031-06-04')).toMatchObject({
      status: { stopped: ['pain'] },
    })
  })

  it.each([
    ['a day that is not offered', '2031-06-03'],
    ["a day made up since (no longer in the list)", '2031-06-05'],
    ['something that is not a date', 'yesterday'],
  ])('refuses %s', (_label, forDay) => {
    expect(startChoiceFor(MAKE_UPS, TODAY, forDay)).toStrictEqual({
      kind: 'unavailable',
      reason: 'not_offered',
    })
  })

  it.each(['not_a_free_day', 'session_done_today'] as const)(
    'refuses an offered day when today is blocked: %s',
    (blockedToday) => {
      const blocked = summary({ ...MAKE_UPS, lateMakeUps: { ...MAKE_UPS.lateMakeUps, blockedToday } })
      expect(startChoiceFor(blocked, TODAY, '2031-06-04')).toStrictEqual({
        kind: 'unavailable',
        reason: blockedToday,
      })
    },
  )

  it('goes back to a session of this program open today, whatever day is asked', () => {
    const open = summary({ ...MAKE_UPS, openSession: { sessionId: 31, localDate: TODAY, workoutId: B } })
    expect(startChoiceFor(open, TODAY, '2031-06-04')).toStrictEqual({ kind: 'resume', sessionId: 31 })
  })
})