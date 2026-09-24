import { describe, it, expect } from 'vitest'
import {
  canModifyProgram,
  canEditTemplate,
  isOwnTemplate,
} from './permissions'
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

describe('isOwnTemplate', () => {
  // Just { id } here: isOwnTemplate's parameter type only asks for an
  // id, because ownership genuinely doesn't depend on role. TypeScript
  // enforces that — passing an inline { id, activeRole } literal is a
  // compile error ("excess property check"), a hint that the extra field
  // wouldn't be used for anything.
  it('is true for the practitioner who created the template', () => {
    expect(isOwnTemplate(makeTemplate(), { id: 7 })).toBe(true)
  })

  it('is false for anyone else', () => {
    expect(isOwnTemplate(makeTemplate(), { id: 999 })).toBe(false)
  })

  // The case that separates it from canModifyProgram: an admin CAN
  // modify the template, but it still isn't theirs.
  it('is false for an admin who did not create it, even though they can modify it', () => {
    const admin = { id: 999, activeRole: 'admin' }
    expect(canModifyProgram(makeTemplate(), admin)).toBe(true)
    expect(isOwnTemplate(makeTemplate(), admin)).toBe(false)
  })

  it('is false when the current user is not known', () => {
    expect(isOwnTemplate(makeTemplate(), undefined)).toBe(false)
  })

  it('still counts an archived template as owned — ownership is a fact, not a permission', () => {
    expect(isOwnTemplate(makeTemplate({ isArchived: true }), { id: 7 })).toBe(
      true,
    )
  })
})