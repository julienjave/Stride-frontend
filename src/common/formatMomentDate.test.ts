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
import { formatMomentDate } from './formatMomentDate'

describe('formatMomentDate', () => {
  it("formats a moment as a long date in the viewer's language", () => {
    // Noon UTC: the same calendar day in every time zone from UTC-11 to
    // UTC+11, so the test doesn't depend on the machine's zone.
    expect(formatMomentDate('2026-10-08T12:00:00.000Z', 'en-US')).toBe('October 8, 2026')
    expect(formatMomentDate('2026-10-08T12:00:00.000Z', 'fr-FR')).toBe('8 octobre 2026')
  })
})