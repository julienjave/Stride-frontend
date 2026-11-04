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
import { lastDayText, makeUpBlockText, makeUpName, makeUpTiming, NOT_OFFERED_TEXT } from './makeUpText'
import { TODAY } from './testData'

// en-GB pinned: dates read "Mon 2 Jun" whatever the test machine's
// language.
const L = 'en-GB'
const LATE = { kind: 'late', forDay: '2031-06-02', workoutId: 57, until: '2031-06-14' } as const
const CATCH_UP = { kind: 'catch_up', forDay: '2031-06-11', workoutId: 58, until: '2031-06-13' } as const

describe('makeUpName', () => {
  it('names the missed day by its date, with its workout or as "The session"', () => {
    expect(makeUpName(LATE, 'A · Mobility', L)).toBe('A · Mobility from Mon 2 Jun')
    expect(makeUpName(LATE, null, L)).toBe('The session of Mon 2 Jun')
  })
})

describe('makeUpTiming', () => {
  it('says on time or late, and until when', () => {
    expect(makeUpTiming(CATCH_UP, TODAY, L)).toBe('On time · until Fri 13 Jun')
    expect(makeUpTiming(LATE, TODAY, L)).toBe('Late · until Sat 14 Jun')
  })

  it('says "today" on the last day', () => {
    expect(makeUpTiming({ ...LATE, until: TODAY }, TODAY, L)).toBe('Late · until today')
  })
})

describe('makeUpBlockText', () => {
  it('words each rule, for one session or several', () => {
    expect(makeUpBlockText('not_a_free_day', true)).toBe(
      "Missed sessions are made up on a free day — a day with nothing scheduled — and today isn't one. You can make them up on another free day.",
    )
    expect(makeUpBlockText('not_a_free_day', false)).toBe(
      "Missed sessions are made up on a free day — a day with nothing scheduled — and today isn't one. You can make it up on another free day.",
    )
    expect(makeUpBlockText('session_done_today', false)).toBe(
      "You've already done a session of this program today, and it's one session a day. You can make it up on another free day.",
    )
  })
})

describe('lastDayText', () => {
  it("names the catch-up whose last day is today, and what choosing a late one costs", () => {
    expect(lastDayText(CATCH_UP, 'B · Strength', L)).toBe(
      'Today is the last day to make up B · Strength from Wed 11 Jun on time. If you make up a late one today instead, it will be missed.',
    )
    expect(lastDayText(CATCH_UP, null, L)).toBe(
      'Today is the last day to make up the session of Wed 11 Jun on time. If you make up a late one today instead, it will be missed.',
    )
  })
})

describe('NOT_OFFERED_TEXT', () => {
  it('says the session can no longer be made up, and where the others are', () => {
    expect(NOT_OFFERED_TEXT).toBe(
      "This missed session can't be made up any more. Your Sessions page lists the ones that still can.",
    )
  })
})