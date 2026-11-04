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
import { activePrograms, progressFraction } from './patientPrograms'
import type { AssignedProgramListItem, ScheduleSummary } from './types'

// Moved with the rules from the patient home's tests (2026-10-17) — the
// same cases, unchanged.

function program(id: number, fields: Partial<AssignedProgramListItem> = {}): AssignedProgramListItem {
  return {
    id,
    patientId: 6,
    assignedBy: 3,
    basedOnTemplateId: null,
    basedOnProgramId: null,
    title: `Program ${id}`,
    startDate: '2031-06-02',
    endDate: null,
    status: 'active',
    isArchived: false,
    allowSwaps: true,
    lateMakeUpDays: null,
    schedules: [],
    assigner: { id: 3, firstName: 'Alex', lastName: 'Chen' },
    workouts: [],
    ...fields,
  }
}

describe('activePrograms', () => {
  it('keeps the active programs, the earliest started first, then by id', () => {
    const list = [
      program(4, { startDate: '2031-06-05' }),
      program(3, { status: 'completed' }),
      program(9, { startDate: '2031-06-01' }),
      program(2, { status: 'cancelled' }),
      program(7, { startDate: '2031-06-05' }),
      program(5, { startDate: '2031-06-05' }),
    ]
    expect(activePrograms(list).map((p) => p.id)).toStrictEqual([9, 4, 5, 7])
    // The cached list is left as it was.
    expect(list.map((p) => p.id)).toStrictEqual([4, 3, 9, 2, 7, 5])
  })
})

describe('progressFraction', () => {
  const totals: ScheduleSummary['totals'] = {
    expected: null,
    done: 0,
    madeUp: 0,
    madeUpLate: 0,
    doneEarly: 0,
    swapped: 0,
    missed: 0,
    extra: 0,
    skipped: 0,
    incomplete: 0,
  }

  it('counts every fulfilled kind out of the whole target', () => {
    expect(
      progressFraction({
        ...totals,
        expected: 12,
        done: 3,
        madeUp: 1,
        madeUpLate: 2,
        doneEarly: 1,
        swapped: 2,
        missed: 4,
        extra: 5,
      }),
    ).toStrictEqual({ fulfilled: 9, expected: 12 })
  })

  it('has no bar for an open-ended program, or a target of zero', () => {
    expect(progressFraction({ ...totals, expected: null, done: 3 })).toBeNull()
    expect(progressFraction({ ...totals, expected: 0 })).toBeNull()
  })
})