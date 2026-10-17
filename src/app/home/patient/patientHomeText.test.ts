import { describe, it, expect } from 'vitest'
import { lateMakeUpWaitingText, longDate, todayText, upcomingText } from './patientHomeText'

// en-GB pinned: dates read "Fri 13 Jun" whatever the test machine's
// language.
const L = 'en-GB'

describe('todayText', () => {
  it('names the workout in progress, or "today\'s session" with one workout', () => {
    expect(todayText({ kind: 'in_progress', workoutId: 57, sessionId: 5 }, 'A · Mobility', L)).toStrictEqual({
      line: 'In progress: A · Mobility',
      detail: null,
    })
    expect(todayText({ kind: 'in_progress', workoutId: 57, sessionId: 5 }, null, L).line).toBe(
      "In progress: today's session",
    )
  })

  it("names the day's workout when it's due, and what was stopped earlier", () => {
    expect(todayText({ kind: 'due', workoutId: 58, stopped: [] }, 'B · Strength', L)).toStrictEqual({
      line: 'B · Strength',
      detail: null,
    })
    expect(
      todayText({ kind: 'due', workoutId: 58, stopped: ['pain', 'no_time'] }, null, L),
    ).toStrictEqual({
      line: "Today's session",
      detail: 'Stopped earlier today (pain, then no time)',
    })
  })

  it("says which day to catch up, by its weekday", () => {
    expect(
      todayText({ kind: 'catch_up', workoutId: 57, forDay: '2031-06-09', stopped: [] }, 'A · Mobility', L),
    ).toStrictEqual({
      line: "Catch up: Monday's A · Mobility",
      detail: 'Not done yet — you can still make it up today.',
    })
    expect(
      todayText({ kind: 'catch_up', workoutId: 57, forDay: '2031-06-11', stopped: ['other'] }, null, L),
    ).toStrictEqual({
      line: "Catch up: Wednesday's session",
      detail: 'Not done yet — you can still make it up today. Stopped earlier today (another reason)',
    })
  })

  it("leads a weekly program with the week's count, then its dates and the next workout", () => {
    const status = {
      kind: 'weekly' as const,
      workoutId: 58,
      done: 1,
      target: 3,
      start: '2031-06-09',
      end: '2031-06-15',
      stopped: [],
    }
    expect(todayText(status, 'B · Strength', L)).toStrictEqual({
      line: '1 of 3 done this week',
      detail: 'This week runs Mon 9 Jun – Sun 15 Jun. Next: B · Strength.',
    })
    // One workout: nothing to name; a session stopped today.
    expect(todayText({ ...status, stopped: ['illness'] }, null, L).detail).toBe(
      'This week runs Mon 9 Jun – Sun 15 Jun. Stopped earlier today (illness)',
    )
  })

  it('words the finished states', () => {
    expect(todayText({ kind: 'done' }, null, L)).toStrictEqual({ line: 'Done for today', detail: null })
    expect(todayText({ kind: 'week_met', target: 3 }, null, L).line).toBe(
      "This week's 3 sessions are done",
    )
    expect(todayText({ kind: 'week_met', target: 1 }, null, L).line).toBe(
      "This week's 1 session is done",
    )
    expect(todayText({ kind: 'skipped', reason: 'no_time' }, null, L)).toStrictEqual({
      line: 'Skipped today (no time)',
      detail: null,
    })
    expect(todayText({ kind: 'paused' }, null, L)).toStrictEqual({
      line: 'Paused',
      detail: 'Nothing to do while your practitioner has paused this program.',
    })
  })
})

describe('upcomingText', () => {
  it('dates a day, with its workout apart', () => {
    expect(
      upcomingText({ kind: 'day', programId: 1, date: '2031-06-13', workoutId: 57 }, 'Knee Rehab', 'A · Mobility', L),
    ).toStrictEqual({ when: 'Fri 13 Jun', what: 'Knee Rehab', workout: 'A · Mobility' })
    expect(
      upcomingText({ kind: 'day', programId: 1, date: '2031-06-13', workoutId: 57 }, 'Knee Rehab', null, L)
        .workout,
    ).toBeNull()
  })

  it("says what a week still needs, and by when", () => {
    expect(
      upcomingText({ kind: 'week_rest', programId: 1, remaining: 2, end: '2031-06-15' }, 'Back', null, L),
    ).toStrictEqual({ when: 'By Sun 15 Jun', what: 'Back: 2 more this week', workout: null })
  })

  it('says when a weekly program starts, and how often', () => {
    expect(
      upcomingText({ kind: 'week_start', programId: 1, start: '2031-06-16', timesPerWeek: 3 }, 'Back', null, L),
    ).toStrictEqual({ when: 'From Mon 16 Jun', what: 'Back: 3× a week', workout: null })
  })
})

describe('longDate', () => {
  it('writes the day in full, read as a calendar date', () => {
    expect(longDate('2031-06-12', L)).toBe('Thursday 12 June')
  })
})

describe('todayText — a late make-up', () => {
  const status = { kind: 'late_make_up', workoutId: 57, forDay: '2031-06-02', until: '2031-06-14' } as const

  it('names the missed day by its date, and the last day it can be done', () => {
    expect(todayText({ ...status, stopped: [] }, 'A · Mobility', L)).toStrictEqual({
      line: 'Make up: A · Mobility from Mon 2 Jun',
      detail: 'Missed — you can still make it up today, or on another free day until Sat 14 Jun.',
    })
  })

  it('says "session" with one workout, and what was stopped earlier', () => {
    expect(todayText({ ...status, stopped: ['pain'] }, null, L)).toStrictEqual({
      line: 'Make up: the session of Mon 2 Jun',
      detail:
        'Missed — you can still make it up today, or on another free day until Sat 14 Jun. Stopped earlier today (pain)',
    })
  })
})

describe('lateMakeUpWaitingText', () => {
  const oldest = { forDay: '2031-06-02', workoutId: 57, until: '2031-06-14' }

  it('names the oldest and its deadline', () => {
    expect(lateMakeUpWaitingText(oldest, 1, false, 'A · Mobility', L)).toBe(
      'You can still make up A · Mobility from Mon 2 Jun on another free day, until Sat 14 Jun.',
    )
  })

  it('counts the others, one or several', () => {
    expect(lateMakeUpWaitingText(oldest, 2, false, null, L)).toBe(
      'You can still make up the session of Mon 2 Jun on another free day, until Sat 14 Jun. 1 other missed session can be made up too.',
    )
    expect(lateMakeUpWaitingText(oldest, 4, false, null, L)).toMatch(/ 3 other missed sessions can be made up too\.$/)
  })

  // Under an on-time catch-up: today is allowed too — never "another free day".
  it('says "also … late" when it could be done today too', () => {
    expect(lateMakeUpWaitingText(oldest, 1, true, 'A · Mobility', L)).toBe(
      'You can also make up A · Mobility from Mon 2 Jun late, until Sat 14 Jun.',
    )
    expect(lateMakeUpWaitingText(oldest, 2, true, null, L)).toBe(
      'You can also make up the session of Mon 2 Jun late, until Sat 14 Jun. 1 other missed session can be made up too.',
    )
  })
})