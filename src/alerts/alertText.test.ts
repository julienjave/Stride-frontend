import { describe, expect, it } from 'vitest'
import {
  alertCountText,
  alertLinkLabel,
  attendanceLines,
  inactivityText,
  missedRunText,
  sessionReasonsText,
} from './alertText'
import { attendanceAlert, sessionAlert } from './testData'

// en-GB pins the date format ("Mon 26 May"); the sentences around it are
// the point. (US formatting adds a comma — "Mon, May 26" — and nothing here
// glues grammar to the formatted date, so both read right.)
const L = 'en-GB'

describe('missedRunText', () => {
  it('says scheduled days were missed, with the noun agreeing', () => {
    expect(missedRunText({ days: 3, weeks: 0, since: '2031-05-26' }, L)).toBe(
      '3 scheduled sessions missed in a row, since Mon 26 May',
    )
    expect(missedRunText({ days: 1, weeks: 0, since: '2031-05-26' }, L)).toBe(
      '1 scheduled session missed in a row, since Mon 26 May',
    )
  })

  it('says weeks ended below target — not "missed"', () => {
    expect(missedRunText({ days: 0, weeks: 2, since: '2031-05-26' }, L)).toBe(
      '2 weeks in a row below target, since Mon 26 May',
    )
    expect(missedRunText({ days: 0, weeks: 1, since: '2031-05-26' }, L)).toBe(
      '1 week in a row below target, since Mon 26 May',
    )
  })

  it('says both across a change of schedule type', () => {
    expect(missedRunText({ days: 2, weeks: 1, since: '2031-05-26' }, L)).toBe(
      '2 scheduled sessions missed and 1 week below target in a row, since Mon 26 May',
    )
  })
})

describe('inactivityText', () => {
  it('dates the last session', () => {
    expect(inactivityText({ days: 9, lastSessionDate: '2031-06-01' }, L)).toBe(
      'No session for 9 days — the last on Sun 1 Jun',
    )
  })

  it('says when there was none since the start', () => {
    expect(inactivityText({ days: 8, lastSessionDate: null }, L)).toBe(
      'No session for 8 days since the program started',
    )
  })
})

describe('attendanceLines', () => {
  it('gives one line per fact, the run first', () => {
    expect(
      attendanceLines(
        attendanceAlert({
          missedInARow: { days: 3, weeks: 0, since: '2031-05-26' },
          inactive: { days: 9, lastSessionDate: '2031-06-01' },
        }),
        L,
      ),
    ).toEqual([
      '3 scheduled sessions missed in a row, since Mon 26 May',
      'No session for 9 days — the last on Sun 1 Jun',
    ])
  })

  it('leaves out the fact that is null', () => {
    expect(
      attendanceLines(attendanceAlert({ missedInARow: null, inactive: { days: 7, lastSessionDate: null } }), L),
    ).toEqual(['No session for 7 days since the program started'])
    expect(attendanceLines(attendanceAlert(), L)).toEqual([
      '2 weeks in a row below target, since Mon 26 May',
    ])
  })
})

describe('sessionReasonsText', () => {
  it('gives the pain as numbers, once for both pain reasons', () => {
    expect(sessionReasonsText(sessionAlert())).toBe('Pain 3 → 7')
    expect(sessionReasonsText(sessionAlert({ reasons: ['pain_rise'] }))).toBe('Pain 3 → 7')
    expect(sessionReasonsText(sessionAlert({ reasons: ['pain_high'] }))).toBe('Pain 3 → 7')
  })

  it('gives the pain after alone when the check-in was left blank', () => {
    expect(
      sessionReasonsText(sessionAlert({ reasons: ['pain_high'], session: { painBefore: null, painAfter: 8 } })),
    ).toBe('Pain after: 8')
  })

  it('adds nothing for a stop for pain — the status line says it', () => {
    expect(
      sessionReasonsText(
        sessionAlert({
          reasons: ['ended_for_pain'],
          session: { status: 'incomplete', endReason: 'pain', painBefore: 5, painAfter: 6 },
        }),
      ),
    ).toBeNull()
  })

  it('names each hard exercise with its rating, and says a note exists without its words', () => {
    expect(
      sessionReasonsText(
        sessionAlert({
          reasons: ['pain_high', 'hard_exercise', 'patient_note'],
          hardExercises: [
            { name: 'Squat', rating: 9 },
            { name: 'Bridge', rating: 8 },
          ],
        }),
      ),
    ).toBe('Pain 3 → 7 · Rated hard: Squat (9/10), Bridge (8/10) · Left a note')
    expect(sessionReasonsText(sessionAlert({ reasons: ['patient_note'] }))).toBe('Left a note')
  })
})

describe('alertCountText', () => {
  it('says the count, and good news for none', () => {
    expect(alertCountText(0)).toBe('All caught up')
    expect(alertCountText(1)).toBe('1 to look at')
    expect(alertCountText(12)).toBe('12 to look at')
  })
})

describe('alertLinkLabel', () => {
  it('starts with the visible words, then says whose and which', () => {
    expect(alertLinkLabel(sessionAlert(), L)).toBe("Review Pat Lee's session of Tue 10 Jun")
    expect(alertLinkLabel(attendanceAlert(), L)).toBe('View program Lower Back — Jo (Jo Novak)')
  })
})