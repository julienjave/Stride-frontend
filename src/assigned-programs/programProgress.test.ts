import { describe, it, expect } from 'vitest'
import {
  arrangeWeeks,
  groupProgressByWeek,
  programWeekOf,
  type ProgressWeek,
} from './programProgress'
import type { CountedWeek, DatedAttempt, ScheduleSummary, ScheduledDay } from './types'

// The program starts on a THURSDAY (29 May 2031), so program weeks run
// Thursday → Wednesday: a rule that cut by calendar week (Monday) would put
// Monday 2 June in week 2 and fail below.
const START = '2031-05-29'

function day(date: string, state: ScheduledDay['state']): ScheduledDay {
  return {
    date,
    workoutId: 57,
    state,
    sessionId: null,
    madeUpBy: null,
    madeUpLateBy: null,
    doneEarlyBy: null,
    swappedBy: null,
    attempts: [],
  }
}

function summary(fields: Partial<ScheduleSummary>): ScheduleSummary {
  return {
    firstDay: START,
    lastDay: '2031-06-15',
    today: '2031-06-12',
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

describe('programWeekOf', () => {
  it('counts program weeks from the start date', () => {
    expect(programWeekOf('2031-05-29', START)).toBe(1)
    expect(programWeekOf('2031-06-04', START)).toBe(1) // day 7, a Wednesday
    expect(programWeekOf('2031-06-05', START)).toBe(2)
  })

  it('puts a day before the start in week 0, not week 1', () => {
    // floor(−1 / 7) = −1 → week 0; truncating would give week 1.
    expect(programWeekOf('2031-05-28', START)).toBe(0)
  })
})

describe('groupProgressByWeek', () => {
  // A weekly count in week 2 alongside its scheduled days: the schedule
  // changed kind mid-week. 2 needed, 1 done, the week closed short.
  const stretch: CountedWeek = {
    programWeek: 2,
    start: '2031-06-08',
    end: '2031-06-11',
    timesPerWeek: 3,
    target: 2,
    workouts: [
      { workoutId: 57, sessionId: 31, date: '2031-06-09' },
      { workoutId: 58, sessionId: null, date: null },
    ],
    done: 1,
    state: 'missed',
    sessionIds: [31],
    attempts: [],
  }

  // Attempts on no scheduled day (the summary's otherAttempts): two inside
  // the program — on week 1's FIRST day and week 2's LAST day, the edges a
  // "> start" or "< end" would drop — and two outside it, before the start
  // and after the last covered day.
  const otherAttempts: DatedAttempt[] = [
    { sessionId: 52, date: '2031-05-27', status: 'incomplete', endReason: 'pain' },
    { sessionId: 50, date: '2031-05-29', status: 'incomplete', endReason: 'no_time' },
    { sessionId: 51, date: '2031-06-11', status: 'incomplete', endReason: 'other' },
    { sessionId: 53, date: '2031-06-16', status: 'incomplete', endReason: 'illness' },
  ]

  const { weeks, outside, outsideAttempts } = groupProgressByWeek(
    summary({
      days: [
        day('2031-05-29', 'done'),
        day('2031-06-02', 'missed'), // a Monday — still week 1
        day('2031-06-04', 'done_early'), // week 1's LAST day (a Wednesday)
        day('2031-06-05', 'made_up'),
        day('2031-06-06', 'swapped'),
        day('2031-06-12', 'due'),
      ],
      weeks: [stretch],
      extraSessions: [
        { sessionId: 40, date: '2031-05-31', reason: 'same_day' },
        // On week 2's last day — the edge a "< end" would drop.
        { sessionId: 43, date: '2031-06-11', reason: 'same_day' },
        { sessionId: 41, date: '2031-05-27', reason: 'outside_program' },
        { sessionId: 42, date: '2031-06-20', reason: 'outside_program' },
      ],
      otherAttempts,
      pauses: [{ from: '2031-06-13', to: null }],
    }),
    START,
  )

  it('lists every program week up to the last covered day, cut there', () => {
    expect(weeks.map((week) => [week.programWeek, week.start, week.end])).toStrictEqual([
      [1, '2031-05-29', '2031-06-04'],
      [2, '2031-06-05', '2031-06-11'],
      // The last covered day is a Sunday (the end date): the week stops there.
      [3, '2031-06-12', '2031-06-15'],
    ])
  })

  it('puts each scheduled day, weekly count and extra session in its program week', () => {
    expect(weeks[0].days.map((d) => d.date)).toStrictEqual([
      '2031-05-29',
      '2031-06-02',
      '2031-06-04',
    ])
    expect(weeks[1].days.map((d) => d.date)).toStrictEqual(['2031-06-05', '2031-06-06'])
    expect(weeks[2].days.map((d) => d.date)).toStrictEqual(['2031-06-12'])
    expect(weeks[1].counted).toStrictEqual([stretch])
    expect(weeks[0].counted).toStrictEqual([])
    expect(weeks[0].extras.map((e) => e.sessionId)).toStrictEqual([40])
    expect(weeks[1].extras.map((e) => e.sessionId)).toStrictEqual([43])
  })

  it('counts what each week asked for, fulfilled and missed', () => {
    // Week 1: 3 days, 2 fulfilled (done, done early), 1 missed.
    expect([weeks[0].expected, weeks[0].fulfilled, weeks[0].missed]).toStrictEqual([3, 2, 1])
    // Week 2: 2 days (made up, swapped — both fulfil their day) + a count
    // of 2 with 1 done, closed short → 4 asked, 3 fulfilled, 1 missed.
    expect([weeks[1].expected, weeks[1].fulfilled, weeks[1].missed]).toStrictEqual([4, 3, 1])
    // Week 3: today's day, not done yet — nothing missed.
    expect([weeks[2].expected, weeks[2].fulfilled, weeks[2].missed]).toStrictEqual([1, 0, 0])
  })

  // A day made up LATE fulfils it, like the other four (2026-10-16): it
  // counts in the week's result, and isn't missed.
  it('counts a day made up late as fulfilled', () => {
    const { weeks: late } = groupProgressByWeek(
      summary({ days: [day('2031-05-29', 'made_up_late'), day('2031-06-02', 'missed')] }),
      START,
    )
    expect([late[0].expected, late[0].fulfilled, late[0].missed]).toStrictEqual([2, 1, 1])
  })

  it("doesn't count a weekly count still in progress as missed", () => {
    const { weeks: running } = groupProgressByWeek(
      summary({ weeks: [{ ...stretch, state: 'in_progress' }] }),
      START,
    )
    expect(running[1].missed).toBe(0)
  })

  it('cuts a pause with no end to the weeks it touches', () => {
    expect(weeks[1].pauses).toStrictEqual([])
    expect(weeks[2].pauses).toStrictEqual([{ from: '2031-06-13', to: '2031-06-15' }])
  })

  it('cuts a pause across two weeks into each week\'s own part', () => {
    const { weeks: paused } = groupProgressByWeek(
      summary({ pauses: [{ from: '2031-06-02', to: '2031-06-07' }] }),
      START,
    )
    expect(paused.map((week) => week.pauses)).toStrictEqual([
      [{ from: '2031-06-02', to: '2031-06-04' }],
      [{ from: '2031-06-05', to: '2031-06-07' }],
      [],
    ])
  })

  it("counts a pause touching a week only by its edge day", () => {
    // From week 1's last day to week 2's first: one day in each.
    const { weeks: paused } = groupProgressByWeek(
      summary({ pauses: [{ from: '2031-06-04', to: '2031-06-05' }] }),
      START,
    )
    expect(paused.map((week) => week.pauses)).toStrictEqual([
      [{ from: '2031-06-04', to: '2031-06-04' }],
      [{ from: '2031-06-05', to: '2031-06-05' }],
      [],
    ])
  })

  it('puts each attempt on no scheduled day in its program week, edges included', () => {
    expect(weeks.map((week) => week.attempts.map((a) => a.sessionId))).toStrictEqual([
      [50],
      [51],
      [],
    ])
  })

  it('keeps attempts outside every week apart, in their order', () => {
    expect(outsideAttempts.map((a) => a.sessionId)).toStrictEqual([52, 53])
  })

  it('keeps extra sessions outside every week apart, in their order', () => {
    expect(outside.map((e) => e.sessionId)).toStrictEqual([41, 42])
    expect(weeks.flatMap((week) => week.extras).map((e) => e.sessionId)).toStrictEqual([40, 43])
  })
})

describe('arrangeWeeks', () => {
  function week(programWeek: number): ProgressWeek {
    const starts = ['2031-05-29', '2031-06-05', '2031-06-12', '2031-06-19']
    const ends = ['2031-06-04', '2031-06-11', '2031-06-18', '2031-06-25']
    return {
      programWeek,
      start: starts[programWeek - 1],
      end: ends[programWeek - 1],
      days: [],
      counted: [],
      extras: [],
      attempts: [],
      pauses: [],
      expected: 0,
      fulfilled: 0,
      missed: 0,
    }
  }
  const weeks = [week(1), week(2), week(3), week(4)]
  const numbers = (list: ProgressWeek[]) => list.map((w) => w.programWeek)

  it("opens on this week, earlier weeks newest first, later weeks soonest first", () => {
    const arranged = arrangeWeeks(weeks, '2031-06-14')
    expect(arranged?.focusRole).toBe('current')
    expect(arranged?.focus.programWeek).toBe(3)
    expect(numbers(arranged?.earlier ?? [])).toStrictEqual([2, 1])
    expect(numbers(arranged?.later ?? [])).toStrictEqual([4])
  })

  it("counts a week's first and last days as inside it", () => {
    expect(arrangeWeeks(weeks, '2031-06-12')?.focus.programWeek).toBe(3)
    expect(arrangeWeeks(weeks, '2031-06-18')?.focus.programWeek).toBe(3)
  })

  it('opens on the first week before the program starts', () => {
    const arranged = arrangeWeeks(weeks, '2031-05-20')
    expect(arranged?.focusRole).toBe('first')
    expect(arranged?.focus.programWeek).toBe(1)
    expect(numbers(arranged?.later ?? [])).toStrictEqual([2, 3, 4])
  })

  it('opens on the last week once the program is over', () => {
    const arranged = arrangeWeeks(weeks, '2031-07-01')
    expect(arranged?.focusRole).toBe('last')
    expect(arranged?.focus.programWeek).toBe(4)
    expect(numbers(arranged?.earlier ?? [])).toStrictEqual([3, 2, 1])
    expect(arranged?.later).toStrictEqual([])
  })

  it("leaves the caller's list in its order", () => {
    arrangeWeeks(weeks, '2031-06-14')
    expect(numbers(weeks)).toStrictEqual([1, 2, 3, 4])
  })

  it('has nothing to arrange without weeks', () => {
    expect(arrangeWeeks([], '2031-06-14')).toBeNull()
  })
})