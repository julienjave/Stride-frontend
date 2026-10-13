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