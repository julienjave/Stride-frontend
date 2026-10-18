import { describe, it, expect } from 'vitest'
import type { ScheduleSummary } from '@/assigned-programs/types'
import { makeUps } from './makeUpRules'
import { A, B, TODAY, summary } from './testData'

// "Today" is Thursday 12 June 2031 (testData). The make-ups below:
//   - an on-time catch-up: Wednesday 11's B, its window open until Friday 13
//     (or until today, where a test says so);
//   - two late ones: Monday 2's A until Saturday 14, Wednesday 4's B until
//     Sunday 15 — different workouts and deadlines, so a rule reading the
//     wrong one gives a different answer.
const CATCH_UP: NonNullable<ScheduleSummary['nextWorkout']> = {
  workoutId: B,
  forDay: '2031-06-11',
  programWeek: null,
  until: '2031-06-13',
}
const LATE_DAYS = [
  { forDay: '2031-06-02', workoutId: A, until: '2031-06-14' },
  { forDay: '2031-06-04', workoutId: B, until: '2031-06-15' },
]

function withLate(fields: Partial<ScheduleSummary> = {}, blockedToday: ScheduleSummary['lateMakeUps']['blockedToday'] = null) {
  return summary({ lateMakeUps: { days: LATE_DAYS, blockedToday }, ...fields })
}

describe('makeUps — what is offered', () => {
  it('lists the on-time catch-up first, then every late one, oldest first', () => {
    expect(makeUps(withLate({ nextWorkout: CATCH_UP }), TODAY)).toStrictEqual({
      offers: [
        { kind: 'catch_up', forDay: '2031-06-11', workoutId: B, until: '2031-06-13' },
        { kind: 'late', forDay: '2031-06-02', workoutId: A, until: '2031-06-14' },
        { kind: 'late', forDay: '2031-06-04', workoutId: B, until: '2031-06-15' },
      ],
      blocked: null,
      lastDay: null,
    })
  })

  it('offers nothing when nothing was missed', () => {
    expect(makeUps(summary(), TODAY)).toStrictEqual({ offers: [], blocked: null, lastDay: null })
  })

  // `nextWorkout` names a day still to come, or today's own, or a week:
  // nothing to catch up.
  it.each<[string, ScheduleSummary['nextWorkout']]>([
    ["today's own session", { workoutId: A, forDay: TODAY, programWeek: null, until: TODAY }],
    ['a later day', { workoutId: A, forDay: '2031-06-13', programWeek: null, until: null }],
    ["a week's count", { workoutId: A, forDay: null, programWeek: 2, until: null }],
  ])('offers no catch-up when what comes next is %s', (_label, nextWorkout) => {
    expect(makeUps(summary({ nextWorkout }), TODAY).offers).toStrictEqual([])
  })
})

describe('makeUps — what blocks them today', () => {
  it("passes on the summary's reason: not a free day, or a session done today", () => {
    expect(makeUps(withLate({}, 'not_a_free_day'), TODAY).blocked).toBe('not_a_free_day')
    expect(makeUps(withLate({}, 'session_done_today'), TODAY).blocked).toBe('session_done_today')
  })

  // The open session may BE one of them (the summary can't say which day it
  // counts for): no list at all while it runs.
  it('lists nothing while a session of this program is open TODAY — not one left open earlier', () => {
    const open = (localDate: string) =>
      withLate({ nextWorkout: CATCH_UP, openSession: { sessionId: 31, localDate, workoutId: A } })
    expect(makeUps(open(TODAY), TODAY)).toStrictEqual({ offers: [], blocked: null, lastDay: null })
    // Left open on an earlier day: the next start closes it — all listed.
    expect(makeUps(open('2031-06-10'), TODAY).offers).toHaveLength(3)
  })

  // Blocked today AND today is its last day: it can never be done — no row
  // with a button that can't work. The others stay listed (disabled).
  it("leaves out one whose last day is today when today is blocked", () => {
    const lastToday = { ...CATCH_UP, until: TODAY }
    const result = makeUps(
      summary({
        nextWorkout: lastToday,
        lateMakeUps: {
          days: [{ forDay: '2031-06-02', workoutId: A, until: TODAY }, LATE_DAYS[1]],
          blockedToday: 'session_done_today',
        },
      }),
      TODAY,
    )
    expect(result.offers.map((offer) => offer.forDay)).toStrictEqual(['2031-06-04'])
  })

  it('keeps one whose last day is today when nothing blocks it', () => {
    const result = makeUps(
      summary({ lateMakeUps: { days: [{ forDay: '2031-06-02', workoutId: A, until: TODAY }], blockedToday: null } }),
      TODAY,
    )
    expect(result.offers.map((offer) => offer.forDay)).toStrictEqual(['2031-06-02'])
  })
})

describe("makeUps — the catch-up's last day", () => {
  const lastToday = { ...CATCH_UP, until: TODAY }

  it('names the catch-up when today is its last day', () => {
    expect(makeUps(withLate({ nextWorkout: lastToday }), TODAY).lastDay).toStrictEqual({
      kind: 'catch_up',
      forDay: '2031-06-11',
      workoutId: B,
      until: TODAY,
    })
  })

  it('names nothing while it can still be done later', () => {
    expect(makeUps(withLate({ nextWorkout: CATCH_UP }), TODAY).lastDay).toBeNull()
  })

  // Blocked: nothing can be chosen today, so there's no choice to warn
  // about (and the catch-up itself is left out — above).
  it('names nothing when today is blocked', () => {
    expect(
      makeUps(withLate({ nextWorkout: lastToday }, 'session_done_today'), TODAY).lastDay,
    ).toBeNull()
  })
})