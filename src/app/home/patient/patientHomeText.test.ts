import { describe, it, expect } from 'vitest'
import { longDate, todayText, upcomingText } from './patientHomeText'

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