import { describe, it, expect } from 'vitest'
import {
  END_REASON_TEXT,
  attemptText,
  dayDetail,
  stretchNote,
  totalsText,
  upNextText,
  weekResult,
  weekTitle,
} from './progressText'
import type { ScheduledDay } from './types'

// en-GB pinned: formatShortDate gives "Mon 2 Jun" whatever the test
// machine's language.
const L = 'en-GB'
const TODAY = '2031-06-12'

function day(fields: Partial<ScheduledDay>): ScheduledDay {
  return {
    date: '2031-06-09',
    workoutId: 57,
    state: 'done',
    sessionId: null,
    madeUpBy: null,
    doneEarlyBy: null,
    swappedBy: null,
    attempts: [],
    ...fields,
  }
}

describe('dayDetail', () => {
  it('says when a missed day was made up', () => {
    expect(
      dayDetail(day({ state: 'made_up', madeUpBy: { sessionId: 4, date: '2031-06-10' } }), TODAY, L),
    ).toBe('Made up on Tue 10 Jun')
  })

  it('says when a day was done early', () => {
    expect(
      dayDetail(day({ state: 'done_early', doneEarlyBy: { sessionId: 6, date: '2031-06-08' } }), TODAY, L),
    ).toBe('Done early on Sun 8 Jun')
  })

  it('names the other day of a swap', () => {
    expect(
      dayDetail(day({ state: 'swapped', swappedBy: { sessionId: 5, date: '2031-06-11' } }), TODAY, L),
    ).toBe('Swapped with Wed 11 Jun')
  })

  it('explains a past day still to do, but not today', () => {
    expect(dayDetail(day({ state: 'due', date: '2031-06-11' }), TODAY, L)).toBe(
      'Not done yet — can still be made up before the next session',
    )
    expect(dayDetail(day({ state: 'due', date: TODAY }), TODAY, L)).toBeNull()
  })

  it('has nothing to add for the other states', () => {
    for (const state of ['done', 'missed', 'upcoming'] as const) {
      expect(dayDetail(day({ state }), TODAY, L)).toBeNull()
    }
  })
})

describe('attemptText', () => {
  it("words a skip with the patient's reason", () => {
    expect(attemptText({ status: 'skipped', endReason: 'illness' })).toBe('Skipped (illness)')
    expect(attemptText({ status: 'skipped', endReason: 'no_time' })).toBe('Skipped (no time)')
  })

  it('says the patient STOPPED a session they ended themselves', () => {
    expect(attemptText({ status: 'incomplete', endReason: 'pain' })).toBe('Stopped (pain)')
    expect(attemptText({ status: 'incomplete', endReason: 'illness' })).toBe('Stopped (illness)')
    expect(attemptText({ status: 'incomplete', endReason: 'no_time' })).toBe('Stopped (no time)')
    expect(attemptText({ status: 'incomplete', endReason: 'other' })).toBe(
      'Stopped (another reason)',
    )
  })

  it("says NOT FINISHED for a session the app closed — nobody pressed Stop", () => {
    expect(attemptText({ status: 'incomplete', endReason: 'not_finished_in_time' })).toBe(
      'Not finished (left open until a later session started)',
    )
    expect(attemptText({ status: 'incomplete', endReason: 'program_closed' })).toBe(
      'Not finished (the program was closed)',
    )
  })

  it('has a wording for every reason', () => {
    // Written out (not read from the Record's keys), so a reason dropped
    // from the Record fails here as well as in the compiler.
    expect(END_REASON_TEXT).toStrictEqual({
      pain: 'pain',
      illness: 'illness',
      no_time: 'no time',
      other: 'another reason',
      not_finished_in_time: 'left open until a later session started',
      program_closed: 'the program was closed',
    })
  })
})

describe('totalsText', () => {
  const totals = {
    expected: 12,
    done: 3,
    madeUp: 1,
    doneEarly: 1,
    swapped: 1,
    missed: 1,
    extra: 2,
    skipped: 1,
    incomplete: 2,
  }
  const none = { skipped: 0, incomplete: 0 }

  it('counts every fulfilled session — done, made up, done early, swapped — of the total', () => {
    expect(totalsText(totals)).toStrictEqual({
      headline: '6 of 12 sessions done',
      parts: '1 made up · 1 done early · 1 swapped · 1 missed · 1 skipped · 2 not finished · 2 extra',
    })
  })

  it("doesn't count skipped or unfinished sessions as done", () => {
    // Only the four fulfilled kinds make the headline: 3 + 1 + 1 + 1.
    expect(totalsText({ ...totals, skipped: 5, incomplete: 5 }).headline).toBe(
      '6 of 12 sessions done',
    )
  })

  it('has no "of" for an open-ended program', () => {
    expect(totalsText({ ...totals, expected: null }).headline).toBe('6 sessions done')
  })

  it('says "session" for one', () => {
    expect(
      totalsText({ expected: null, done: 1, madeUp: 0, doneEarly: 0, swapped: 0, missed: 0, extra: 0, ...none }),
    ).toStrictEqual({ headline: '1 session done', parts: null })
    expect(totalsText({ expected: 1, done: 0, madeUp: 0, doneEarly: 0, swapped: 0, missed: 0, extra: 0, ...none }).headline).toBe(
      '0 of 1 session done',
    )
  })

  it('lists only what is not zero', () => {
    expect(totalsText({ ...totals, madeUp: 0, extra: 0, ...none }).parts).toBe(
      '1 done early · 1 swapped · 1 missed',
    )
  })
})

describe('weekTitle', () => {
  it("shows a program week's dates", () => {
    expect(weekTitle({ programWeek: 2, start: '2031-06-05', end: '2031-06-11' }, L)).toBe(
      'Week 2 · Thu 5 Jun – Wed 11 Jun',
    )
  })

  it('shows one date for a one-day week', () => {
    expect(weekTitle({ programWeek: 3, start: '2031-06-12', end: '2031-06-12' }, L)).toBe(
      'Week 3 · Thu 12 Jun',
    )
  })
})

describe('weekResult', () => {
  it('says how much of the week was done, and what was missed', () => {
    expect(weekResult({ expected: 3, fulfilled: 2, missed: 1, pauses: [] })).toBe(
      '2 of 3 done · 1 missed',
    )
    expect(weekResult({ expected: 3, fulfilled: 1, missed: 0, pauses: [] })).toBe('1 of 3 done')
  })

  it('tells a paused week from one with nothing scheduled', () => {
    expect(weekResult({ expected: 0, fulfilled: 0, missed: 0, pauses: [{}] })).toBe('Paused')
    expect(weekResult({ expected: 0, fulfilled: 0, missed: 0, pauses: [] })).toBe(
      'Nothing scheduled',
    )
  })
})

describe('upNextText', () => {
  it("names today's, a later day's, and a make-up's workout", () => {
    const next = { workoutId: 57, programWeek: null }
    expect(upNextText({ ...next, forDay: TODAY }, TODAY, 'A · Mobility', L)).toBe(
      'A · Mobility, today',
    )
    expect(upNextText({ ...next, forDay: '2031-06-16' }, TODAY, 'A · Mobility', L)).toBe(
      'A · Mobility, on Mon 16 Jun',
    )
    expect(upNextText({ ...next, forDay: '2031-06-09' }, TODAY, 'A · Mobility', L)).toBe(
      'A · Mobility, to make up Mon 9 Jun',
    )
  })

  it("names the next workout of a week's count", () => {
    expect(
      upNextText({ workoutId: 57, forDay: null, programWeek: 2 }, TODAY, 'B', L),
    ).toBe('B, for week 2')
  })

  it('says "A session" when there is no workout to name', () => {
    expect(upNextText({ workoutId: 57, forDay: TODAY, programWeek: null }, TODAY, null, L)).toBe(
      'A session, today',
    )
    expect(
      upNextText({ workoutId: 57, forDay: null, programWeek: 2 }, TODAY, null, L),
    ).toBe('A session, for week 2')
  })

  it('has nothing to say when nothing is next', () => {
    expect(upNextText(null, TODAY, 'A', L)).toBeNull()
  })
})

describe('stretchNote', () => {
  it("gives a short stretch's dates and its scaled target", () => {
    expect(stretchNote({ start: '2031-06-09', end: '2031-06-12', target: 2 }, L)).toBe(
      'Mon 9 Jun – Thu 12 Jun: target 2 for these 4 days',
    )
  })

  it('says "this day" for a one-day stretch', () => {
    expect(stretchNote({ start: '2031-06-09', end: '2031-06-09', target: 0 }, L)).toBe(
      'Mon 9 Jun: target 0 for this day',
    )
  })
})