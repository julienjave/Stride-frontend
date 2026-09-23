import { describe, it, expect } from 'vitest'
import { canModifyProgram, canEditTemplate } from './permissions'
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

describe('canEditTemplate', () => {
  const owner = { id: 7, activeRole: 'practitioner' }

  it('allows the owner of a live (non-archived) template', () => {
    expect(canEditTemplate(makeTemplate(), owner)).toBe(true)
  })

  it('rejects a practitioner who does not own it', () => {
    expect(
      canEditTemplate(makeTemplate(), { id: 999, activeRole: 'practitioner' }),
    ).toBe(false)
  })

  it('rejects even the owner once the template is archived', () => {
    expect(canEditTemplate(makeTemplate({ isArchived: true }), owner)).toBe(
      false,
    )
  })

  it('rejects when the current user is not known', () => {
    expect(canEditTemplate(makeTemplate(), undefined)).toBe(false)
  })
})