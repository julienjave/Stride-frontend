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
import { formatMomentDate } from '@/common/formatMomentDate'
import { amendsText, authorText, earlierToggleText, entryHeading, replacedText } from './medicalFileText'
import { entry } from './testData'

describe('the medical file words', () => {
  it('heads a version with its type and day, and names its author', () => {
    const e = entry(1, { entryType: 'discharge_summary' })
    expect(entryHeading(e)).toBe(`Discharge summary · ${formatMomentDate('2031-03-04T10:00:00.000Z')}`)
    expect(entryHeading(entry(2, { entryType: 'initial_assessment' }))).toMatch(/^Initial assessment · /)
    expect(entryHeading(entry(3))).toMatch(/^Progress note · /)
    expect(authorText(e)).toBe('Written by Alex Chen')
  })

  it("says what an amendment corrects — the ORIGINAL's day — in each audience's words", () => {
    const original = entry(2, { createdAt: '2031-03-11T09:00:00.000Z' })
    const amendment = entry(3, { amendsId: 2, amendmentReason: 'Wrong knee recorded' })
    const day = formatMomentDate('2031-03-11T09:00:00.000Z')
    expect(amendsText(amendment, original, 'practitioner')).toBe(`Amends the entry of ${day}: Wrong knee recorded`)
    expect(amendsText(amendment, original, 'patient')).toBe(`Corrects the entry of ${day}: Wrong knee recorded`)
  })

  it('names the toggle by how many earlier versions it hides or shows', () => {
    expect(earlierToggleText(1, false)).toBe('Show the original')
    expect(earlierToggleText(1, true)).toBe('Hide the original')
    expect(earlierToggleText(2, false)).toBe('Show the 2 earlier versions')
    expect(earlierToggleText(3, true)).toBe('Hide the 3 earlier versions')
  })

  it("dates a replaced version by the version that replaced it", () => {
    expect(replacedText(entry(4, { createdAt: '2031-03-12T11:00:00.000Z' }))).toBe(
      `Amended on ${formatMomentDate('2031-03-12T11:00:00.000Z')}`,
    )
  })
})