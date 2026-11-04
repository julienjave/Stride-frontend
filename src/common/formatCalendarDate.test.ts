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

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { formatCalendarDate } from './formatCalendarDate'

describe('formatCalendarDate', () => {
  it('formats a stored date as a long, readable date', () => {
    expect(formatCalendarDate('1990-01-01', 'en-US')).toBe('January 1, 1990')
  })

  // The bug this guards against: without timeZone 'UTC', a date is shown
  // in the reader's own zone, and anywhere WEST of UTC, midnight UTC is
  // still the previous evening — a birthday shown one day early. The
  // machine running the tests might be anywhere (Paris is EAST of UTC,
  // where the bug never shows), so this block moves Node's zone to New
  // York for its duration (Node re-reads the TZ variable when it changes).
  describe('in a time zone west of UTC', () => {
    // vi.stubEnv sets the variable for this block, and vi.unstubAllEnvs
    // puts back whatever was there before (including "not set at all") —
    // Vitest's typed way to do it, since this frontend's TypeScript setup
    // deliberately has no Node types (no `process` in browser code).
    beforeAll(() => {
      vi.stubEnv('TZ', 'America/New_York')
    })
    afterAll(() => {
      vi.unstubAllEnvs()
    })

    it('keeps the calendar day as stored — not the evening before', () => {
      expect(formatCalendarDate('2000-01-01', 'en-US')).toBe('January 1, 2000')
    })
  })

  it("follows the requested locale's format", () => {
    expect(formatCalendarDate('1990-01-01', 'fr-FR')).toBe('1 janvier 1990')
  })
})