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
import { longDate, upcomingText } from './patientHomeText'

// en-GB pinned: dates read "Fri 13 Jun" whatever the test machine's
// language.
const L = 'en-GB'

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