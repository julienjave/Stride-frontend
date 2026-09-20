import { describe, it, expect } from 'vitest'
import { isOwnAssignedProgram } from './permissions'
import type { AssignedProgram } from './types'

function makeProgram(overrides: Partial<AssignedProgram> = {}): AssignedProgram {
  return {
    id: 1,
    patientId: 50,
    assignedBy: 7,
    basedOnTemplateId: null,
    title: 'Shoulder Rehab',
    startDate: '2026-01-01',
    endDate: null,
    status: 'active',
    isArchived: false,
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