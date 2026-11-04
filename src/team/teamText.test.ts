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

import { describe, expect, it } from 'vitest'
import { addedByText, endedByText, memberPeriodText, specialtiesText } from './teamText'
import { ALEX, AVERY, SAM, member } from './testData'

// en-US pinned, so the dates read the same on every machine. Noon UTC: the
// same calendar day in every time zone the suite runs under.
const US = 'en-US'
const STARTED = '2031-03-02T12:00:00.000Z'
const ENDS = '2031-04-20T12:00:00.000Z'

describe('memberPeriodText', () => {
  it('says since when a current member has been on the team', () => {
    expect(memberPeriodText(member(ALEX, { startedAt: STARTED }), US)).toBe(
      'On your team since March 2, 2031',
    )
  })

  it('adds a planned end, as a date only', () => {
    expect(memberPeriodText(member(ALEX, { startedAt: STARTED, endsAt: ENDS }), US)).toBe(
      'On your team since March 2, 2031, until April 20, 2031',
    )
  })

  it('gives a past member their period', () => {
    expect(
      memberPeriodText(member(ALEX, { startedAt: STARTED, endsAt: ENDS, isActive: false }), US),
    ).toBe('On your team from March 2, 2031 to April 20, 2031')
  })

  it('says "ended" for a link that stopped giving access without an end date', () => {
    expect(memberPeriodText(member(ALEX, { startedAt: STARTED, isActive: false }), US)).toBe(
      'On your team from March 2, 2031 (ended)',
    )
  })
})

describe('addedByText', () => {
  it('names whoever ELSE added the practitioner', () => {
    expect(addedByText(member(SAM, { createdBy: ALEX }))).toBe('Added by Alex Chen')
  })

  it('says nothing for someone who joined themselves, or a link with no creator', () => {
    expect(addedByText(member(ALEX, { createdBy: ALEX }))).toBeNull()
    expect(addedByText(member(ALEX, { createdBy: null }))).toBeNull()
  })
})

describe('endedByText', () => {
  it('names whoever else ended a past link', () => {
    expect(endedByText(member(SAM, { isActive: false, endsAt: ENDS, endedBy: AVERY }))).toBe(
      'Ended by Avery Admin',
    )
  })

  it('says nothing when they left themselves, when nobody is recorded, or while it is active', () => {
    expect(endedByText(member(SAM, { isActive: false, endsAt: ENDS, endedBy: SAM }))).toBeNull()
    expect(endedByText(member(SAM, { isActive: false, endedBy: null }))).toBeNull()
    // A planned end with someone recorded doesn't make it a past link.
    expect(endedByText(member(SAM, { endsAt: ENDS, endedBy: AVERY }))).toBeNull()
  })
})

describe('specialtiesText', () => {
  it('joins them, or gives nothing when there are none', () => {
    expect(specialtiesText(['Knee rehabilitation', 'Post-surgery'])).toBe(
      'Knee rehabilitation · Post-surgery',
    )
    expect(specialtiesText(['Shoulder'])).toBe('Shoulder')
    expect(specialtiesText([])).toBeNull()
  })
})