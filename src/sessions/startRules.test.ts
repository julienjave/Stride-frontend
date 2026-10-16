import { describe, it, expect } from 'vitest'
import type {
  AssignedProgramExercise,
  ScheduleSummary,
  ScheduledDay,
} from '@/assigned-programs/types'
import { sessionLeftOpen, skippableWorkout, startChoice, workoutExercises } from './startRules'

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
        nextWorkout: { workoutId: B, forDay: '2031-06-11', programWeek: null },
      }),
      TODAY,
    )
    expect(choice).toMatchObject({ kind: 'start', workoutId: B, status: { kind: 'catch_up' } })
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
    ['a catch-up day', { days: [day('2031-06-11', 'due', B)], nextWorkout: { workoutId: B, forDay: '2031-06-11', programWeek: null } }],
    ['done', { days: [day(TODAY, 'done')] }],
    ['open', { days: [day(TODAY, 'due')], openSession: { sessionId: 31, localDate: TODAY, workoutId: A } }],
    ['paused', { days: [day(TODAY, 'due')], pauses: [{ from: '2031-06-01', to: null }] }],
    ['a day with nothing', {}],
  ])('gives nothing on %s', (_label, fields) => {
    expect(skippableWorkout(summary(fields), TODAY)).toBeNull()
  })
})