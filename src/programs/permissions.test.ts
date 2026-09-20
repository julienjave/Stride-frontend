import { describe, it, expect } from 'vitest'
import { canModifyProgram } from './permissions'
import type { ProgramTemplate } from './types'

function makeTemplate(overrides: Partial<ProgramTemplate> = {}): ProgramTemplate {
  return {
    id: 1,
    practitionerId: 7,
    title: 'Shoulder Rehab',
    description: null,
    isArchived: false,
    ...overrides,
  }
}

describe('canModifyProgram', () => {
  it('allows the practitioner who created the template', () => {
    expect(
      canModifyProgram(makeTemplate({ practitionerId: 7 }), {
        id: 7,
        activeRole: 'practitioner',
      }),
    ).toBe(true)
  })

  it('rejects a different practitioner', () => {
    expect(
      canModifyProgram(makeTemplate({ practitionerId: 7 }), {
        id: 999,
        activeRole: 'practitioner',
      }),
    ).toBe(false)
  })

  it('allows an admin regardless of who created the template', () => {
    expect(
      canModifyProgram(makeTemplate({ practitionerId: 7 }), {
        id: 999,
        activeRole: 'admin',
      }),
    ).toBe(true)
  })
})