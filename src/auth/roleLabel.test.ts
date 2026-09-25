import { describe, it, expect } from 'vitest'
import { roleLabel } from './roleLabel'

describe('roleLabel', () => {
  it.each([
    ['admin', 'Admin'],
    ['practitioner', 'Practitioner'],
    ['patient', 'Patient'],
  ] as const)('%s → %s', (role, label) => {
    expect(roleLabel(role)).toBe(label)
  })
})