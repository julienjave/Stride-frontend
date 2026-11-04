/*
    Copyright 2026 Julien Javelaud

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
// -----------------------------------------------------------------------------------------------------------

import { describe, it, expect } from 'vitest'
import type { ScoredSession } from './scoreRules'
import {
  TREND_TEXT,
  latestPainAfterText,
  mobilitySummaryText,
  noScoresText,
  noSessionsText,
  painSummaryText,
  scoreValueText,
  sessionLineText,
} from './scoreText'

// en-GB pinned for exact strings ("Thu 12 Jun"); one en-US case each where
// a date sits inside a sentence (the lesson of 2026-10-17: wording tests
// pinned to one locale hid "Fri, Oct 2's").

function s(id: number, localDate: string, more: Partial<ScoredSession> = {}): ScoredSession {
  return {
    id,
    localDate,
    status: 'completed',
    endReason: null,
    workoutId: 57,
    painBefore: 5,
    painAfter: 3,
    mobilityAfter: 6,
    ...more,
  }
}

describe('painSummaryText', () => {
  it('counts the sessions with a pain score and gives the latest session’s two', () => {
    expect(
      painSummaryText(
        [
          s(1, '2031-06-09', { painBefore: 6, painAfter: 5 }),
          s(2, '2031-06-12', { painBefore: 4, painAfter: 2 }),
        ],
        'en-GB',
      ),
    ).toBe('2 sessions with a pain score. Latest (Thu 12 Jun): 4 before, 2 after.')
  })

  it('reads the same in American English', () => {
    expect(painSummaryText([s(2, '2031-06-12', { painBefore: 4, painAfter: 2 })], 'en-US')).toBe(
      '1 session with a pain score. Latest (Thu, Jun 12): 4 before, 2 after.',
    )
  })

  // The last check-out wasn't answered: "before" and "after" come from two
  // sessions, each with its own date — never presented as one session's.
  it('dates each latest value when they come from different sessions', () => {
    expect(
      painSummaryText(
        [s(1, '2031-06-09', { painBefore: 6, painAfter: 5 }), s(2, '2031-06-12', { painBefore: 4, painAfter: null })],
        'en-GB',
      ),
    ).toBe('2 sessions with a pain score. Latest before: 4 (Thu 12 Jun), latest after: 5 (Mon 9 Jun).')
  })

  it('gives only the series that has answers', () => {
    expect(painSummaryText([s(1, '2031-06-12', { painBefore: 7, painAfter: null })], 'en-GB')).toBe(
      '1 session with a pain score. Latest before: 7 (Thu 12 Jun).',
    )
    expect(painSummaryText([s(1, '2031-06-12', { painBefore: null, painAfter: 0 })], 'en-GB')).toBe(
      '1 session with a pain score. Latest after: 0 (Thu 12 Jun).',
    )
  })

  // A session that answered neither isn't counted.
  it('counts only sessions that answered', () => {
    expect(
      painSummaryText(
        [s(1, '2031-06-09', { painBefore: null, painAfter: null }), s(2, '2031-06-12')],
        'en-GB',
      ),
    ).toBe('1 session with a pain score. Latest (Thu 12 Jun): 5 before, 3 after.')
    expect(painSummaryText([], 'en-GB')).toBe('0 sessions with a pain score.')
  })
})

describe('mobilitySummaryText', () => {
  it('counts the sessions with a mobility score and gives the latest', () => {
    expect(
      mobilitySummaryText(
        [s(1, '2031-06-09', { mobilityAfter: 4 }), s(2, '2031-06-12', { mobilityAfter: null })],
        'en-GB',
      ),
    ).toBe('1 session with a mobility score. Latest (Mon 9 Jun): 4.')
    expect(mobilitySummaryText([s(1, '2031-06-09'), s(2, '2031-06-12', { mobilityAfter: 0 })], 'en-US')).toBe(
      '2 sessions with a mobility score. Latest (Thu, Jun 12): 0.',
    )
  })

  it('gives the count alone when nobody answered', () => {
    expect(mobilitySummaryText([s(1, '2031-06-09', { mobilityAfter: null })], 'en-GB')).toBe(
      '0 sessions with a mobility score.',
    )
  })
})

describe('noScoresText and noSessionsText', () => {
  it('tells the patient where the questions are, and that they are optional', () => {
    expect(noScoresText('pain', 'patient', false)).toBe(
      'No pain scores yet. Each session asks how much it hurts before and after — answering is always optional.',
    )
    expect(noScoresText('mobility', 'patient', false)).toBe(
      'No mobility scores yet. Each session asks how freely you moved, at the end — answering is always optional.',
    )
  })

  it('tells the care team the patient has recorded none', () => {
    expect(noScoresText('pain', 'practitioner', false)).toBe(
      "No pain scores yet: the patient hasn't recorded any in this program.",
    )
    expect(noScoresText('mobility', 'practitioner', false)).toBe(
      "No mobility scores yet: the patient hasn't recorded any in this program.",
    )
  })

  // Answers exist, before the 12 weeks shown: the same sentence for both
  // readers.
  it('points to the whole program when the answers are older than 12 weeks', () => {
    for (const viewer of ['patient', 'practitioner'] as const) {
      expect(noScoresText('pain', viewer, true)).toBe(
        'No pain scores in the last 12 weeks. Show the whole program to see earlier ones.',
      )
      expect(noScoresText('mobility', viewer, true)).toBe(
        'No mobility scores in the last 12 weeks. Show the whole program to see earlier ones.',
      )
    }
  })

  it('says there is no session yet', () => {
    expect(noSessionsText('patient')).toBe(
      'Your pain and mobility scores will show here after your first session.',
    )
    expect(noSessionsText('practitioner')).toBe('No sessions yet.')
  })
})

describe('sessionLineText', () => {
  it('names the day and the workout of a completed session', () => {
    expect(sessionLineText(s(1, '2031-06-12'), 'A · Mobility', 'en-GB')).toBe('Thu 12 Jun · A · Mobility')
  })

  it('leaves the workout out when the program has one', () => {
    expect(sessionLineText(s(1, '2031-06-12'), null, 'en-GB')).toBe('Thu 12 Jun')
  })

  it('says how a session ended when it was not completed', () => {
    expect(
      sessionLineText(s(1, '2031-06-12', { status: 'incomplete', endReason: 'pain' }), 'B · Strength', 'en-GB'),
    ).toBe('Thu 12 Jun · B · Strength · Stopped (pain)')
    expect(sessionLineText(s(1, '2031-06-12', { status: 'skipped', endReason: 'pain' }), null, 'en-GB')).toBe(
      'Thu 12 Jun · Skipped (pain)',
    )
    expect(sessionLineText(s(1, '2031-06-12', { status: 'in_progress' }), null, 'en-GB')).toBe(
      'Thu 12 Jun · In progress',
    )
  })
})

describe('scoreValueText', () => {
  it('gives the number — 0 included', () => {
    expect(scoreValueText(7, true)).toBe('7')
    expect(scoreValueText(0, true)).toBe('0')
  })

  it('tells "not answered" from "never asked"', () => {
    expect(scoreValueText(null, true)).toBe('Not answered')
    expect(scoreValueText(null, false)).toBe('—')
  })
})

describe('the home’s trend words', () => {
  it('gives the latest pain after and its day', () => {
    expect(latestPainAfterText(s(1, '2031-06-12', { painAfter: 2 }), 'en-GB')).toBe(
      'Pain after sessions: 2 (Thu 12 Jun)',
    )
    expect(latestPainAfterText(s(1, '2031-06-12', { painAfter: 0 }), 'en-US')).toBe(
      'Pain after sessions: 0 (Thu, Jun 12)',
    )
  })

  // The words carry the meaning; the arrow repeats it for the eye.
  it('says each direction in words, with its arrow', () => {
    expect(TREND_TEXT).toStrictEqual({
      lower: { arrow: '↓', words: 'lower over your last 3 sessions' },
      higher: { arrow: '↑', words: 'higher over your last 3 sessions' },
      steady: { arrow: '→', words: 'steady over your last 3 sessions' },
    })
  })
})