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
import { endDateForWeeks, nextMonday, programWeekRange } from './programDates'

// June 2031: Sunday 1, Monday 2, Thursday 5, Sunday 8, Monday 9.

describe('nextMonday', () => {
  it('is the first Monday after the given day', () => {
    expect(nextMonday('2031-06-05')).toBe('2031-06-09') // Thursday → 4 days
    // Sunday → the very next day (the case "the Monday of this ISO week"
    // gets wrong: that would be 26 May, in the past).
    expect(nextMonday('2031-06-01')).toBe('2031-06-02')
  })

  it('on a Monday, is the following one — never today', () => {
    expect(nextMonday('2031-06-02')).toBe('2031-06-09')
  })
})

describe('endDateForWeeks', () => {
  it('ends the day before the start weekday comes round again: whole program weeks', () => {
    // Thursday start, 2 weeks → Wednesday 18th: days 5…18 = 14 days. The
    // naive start + 7 × 2 (Thursday 19th) would add a short third week.
    expect(endDateForWeeks('2031-06-05', 2)).toBe('2031-06-18')
    // One week from a Monday: Monday → Sunday.
    expect(endDateForWeeks('2031-06-02', 1)).toBe('2031-06-08')
  })
})

describe('programWeekRange', () => {
  it('says which weekday a program week starts and ends on', () => {
    expect(programWeekRange('2031-06-05')).toBe('Thursday to Wednesday')
    expect(programWeekRange('2031-06-02')).toBe('Monday to Sunday')
    // A Sunday start: the week ends on Saturday (not "Sunday to Sunday").
    expect(programWeekRange('2031-06-01')).toBe('Sunday to Saturday')
  })
})