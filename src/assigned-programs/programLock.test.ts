import { describe, expect, it } from 'vitest'
import { programLock } from './programLock'

const OPEN = { status: 'active', isArchived: false } as const

describe('programLock', () => {
  it('is null for an open program of an active patient — or one not loaded yet', () => {
    expect(programLock(OPEN, true)).toBeNull()
    // Not known yet: changeable (the backend's 409 still stands behind it).
    expect(programLock(OPEN, undefined)).toBeNull()
  })

  it("is 'patient_deactivated' for an open program of a deactivated patient", () => {
    expect(programLock(OPEN, false)).toBe('patient_deactivated')
  })

  // Closed wins: reactivating wouldn't make it changeable.
  it.each([
    ['completed', { status: 'completed', isArchived: false }],
    ['cancelled', { status: 'cancelled', isArchived: false }],
    ['deleted', { status: 'active', isArchived: true }],
  ] as const)("is 'closed' for a %s program, whatever the account", (_label, program) => {
    expect(programLock(program, true)).toBe('closed')
    expect(programLock(program, false)).toBe('closed')
    expect(programLock(program, undefined)).toBe('closed')
  })
})