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
import { isOwnAssignedProgram, isProgramOpen } from './permissions'
import type { AssignedProgram } from './types'

function makeProgram(overrides: Partial<AssignedProgram> = {}): AssignedProgram {
  return {
    id: 1,
    patientId: 50,
    assignedBy: 7,
    basedOnTemplateId: null,
    basedOnProgramId: null,
    title: 'Shoulder Rehab',
    startDate: '2026-01-01',
    endDate: null,
    status: 'active',
    isArchived: false,
    allowSwaps: true,
    lateMakeUpDays: null,
    schedules: [],
    ...overrides,
  }
}

describe('isOwnAssignedProgram', () => {
  it('is true when the current user assigned it', () => {
    expect(
      isOwnAssignedProgram(makeProgram({ assignedBy: 7 }), { id: 7 }),
    ).toBe(true)
  })

  it('is false when a different practitioner assigned it, even for a shared patient', () => {
    expect(
      isOwnAssignedProgram(makeProgram({ assignedBy: 999 }), { id: 7 }),
    ).toBe(false)
  })
})

describe('isProgramOpen', () => {
  it('is open while active and not deleted', () => {
    expect(isProgramOpen(makeProgram())).toBe(true)
  })

  it.each([
    ['completed', { status: 'completed' as const }],
    ['cancelled', { status: 'cancelled' as const }],
    ['deleted (archived) while still active', { isArchived: true }],
  ])('is closed when %s', (_label, change) => {
    expect(isProgramOpen(makeProgram(change))).toBe(false)
  })
})