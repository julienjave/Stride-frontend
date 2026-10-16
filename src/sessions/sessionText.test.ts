import { describe, it, expect } from 'vitest'
import {
  checklistProgressText,
  leftOpenText,
  nothingToStartText,
  sessionStatusText,
  startContextText,
  startedText,
} from './sessionText'

// Pinned locale (and time zone, for the one moment): the wordings are
// tested, not the machine's settings.
const L = 'en-GB'

describe('startContextText', () => {
  it("says a scheduled day's session is today's", () => {
    expect(startContextText({ kind: 'due', workoutId: 57, stopped: [] }, L)).toBe("Today's session.")
  })

  it('names the missed day by its weekday for a catch-up', () => {
    expect(
      startContextText({ kind: 'catch_up', workoutId: 58, forDay: '2031-06-11', stopped: [] }, L),
    ).toBe("Catching up Wednesday's session: it was missed, and you can still make it up today.")
  })

  it('says which session of the week this one will be, with the week’s dates', () => {
    expect(
      startContextText(
        {
          kind: 'weekly',
          workoutId: 70,
          done: 1,
          target: 3,
          start: '2031-06-09',
          end: '2031-06-15',
          stopped: [],
        },
        L,
      ),
    ).toBe('Session 2 of 3 this week (Mon 9 Jun – Sun 15 Jun).')
  })
})

describe('nothingToStartText', () => {
  it.each([
    [null, 'There is no session to do today for this program.'],
    [{ kind: 'done' as const }, "Today's session is done."],
    [{ kind: 'week_met' as const, target: 1 }, "This week's 1 session is done."],
    [{ kind: 'week_met' as const, target: 3 }, "This week's 3 sessions are done."],
    [{ kind: 'skipped' as const, reason: 'no_time' as const }, "You skipped today's session (no time)."],
    [
      { kind: 'paused' as const },
      'This program is paused: there is nothing to do while your practitioner has paused it.',
    ],
  ])('%j → %s', (status, text) => {
    expect(nothingToStartText(status)).toBe(text)
  })
})

describe('leftOpenText', () => {
  it('says the day, and what will happen to it', () => {
    expect(leftOpenText('2031-06-09', L)).toBe(
      'Your session of Mon 9 Jun was left open. It can no longer be finished, and will be kept as not finished.',
    )
  })
})

describe('sessionStatusText', () => {
  it.each([
    [{ status: 'in_progress' as const, endReason: null }, 'In progress'],
    [{ status: 'completed' as const, endReason: null }, 'Completed'],
    // Endings worded as on the practitioner's page.
    [{ status: 'incomplete' as const, endReason: 'pain' as const }, 'Stopped (pain)'],
    [
      { status: 'incomplete' as const, endReason: 'not_finished_in_time' as const },
      'Not finished (left open until a later session started)',
    ],
    [{ status: 'skipped' as const, endReason: 'illness' as const }, 'Skipped (illness)'],
    // A row without its reason can't exist (a CHECK), but never crashes.
    [{ status: 'incomplete' as const, endReason: null }, 'Stopped (another reason)'],
  ])('%j → %s', (session, text) => {
    expect(sessionStatusText(session)).toBe(text)
  })
})

describe('startedText', () => {
  const TODAY = '2031-06-12'

  it("says the time on the session's own day, in the viewer's zone", () => {
    const session = { localDate: TODAY, startedAt: '2031-06-12T12:05:00.000Z' }
    expect(startedText(session, TODAY, L, 'Europe/Paris')).toBe('Started at 14:05')
    expect(startedText(session, TODAY, L, 'America/Montreal')).toBe('Started at 8:05')
  })

  // The DAY is the session's own (`localDate`), not the moment's: here the
  // moment, read in Paris, is already the 10th — the session still belongs
  // to the 9th, the day the patient's device said.
  it('says the day, not the time, on another day', () => {
    const session = { localDate: '2031-06-09', startedAt: '2031-06-09T22:30:00.000Z' }
    expect(startedText(session, TODAY, L, 'Europe/Paris')).toBe('Started on Mon 9 Jun')
  })

  it('says nothing for a session never started (a skip)', () => {
    expect(startedText({ localDate: TODAY, startedAt: null }, TODAY, L)).toBeNull()
  })
})

describe('checklistProgressText', () => {
  it('counts the ticked exercises', () => {
    expect(
      checklistProgressText([{ completed: true }, { completed: false }, { completed: true }]),
    ).toBe('2 of 3 exercises done')
  })

  it('says "exercise" for one', () => {
    expect(checklistProgressText([{ completed: false }])).toBe('0 of 1 exercise done')
  })
})