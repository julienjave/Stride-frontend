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
import { equipmentText, makeUpTodayLabel, sessionLinkLabel } from './programPageText'

// en-GB pinned: dates read "Wed 4 Jun" whatever the test machine's language.
const L = 'en-GB'

describe('sessionLinkLabel', () => {
  it('starts with the visible words and names the session — differently for each kind', () => {
    expect(sessionLinkLabel('2031-06-04', 'counted', L)).toBe('View session of Wed 4 Jun')
    expect(sessionLinkLabel('2031-06-04', 'stopped', L)).toBe('View session of Wed 4 Jun (stopped)')
    expect(sessionLinkLabel('2031-06-04', 'extra', L)).toBe('View session of Wed 4 Jun (extra)')
  })
})

describe('makeUpTodayLabel', () => {
  it("names the missed session as the hub does", () => {
    expect(makeUpTodayLabel('2031-06-04', 'B · Strength', L)).toBe(
      'Make it up today: B · Strength from Wed 4 Jun',
    )
    expect(makeUpTodayLabel('2031-06-04', null, L)).toBe('Make it up today: the session of Wed 4 Jun')
  })
})

describe('equipmentText', () => {
  it('lists the equipment, or says nothing with none', () => {
    expect(equipmentText(['band', 'chair'])).toBe('Equipment: band, chair')
    expect(equipmentText([])).toBeNull()
  })
})