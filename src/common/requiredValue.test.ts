import { describe, it, expect } from 'vitest'
import { requiredValue } from './requiredValue'

describe('requiredValue', () => {
  it('passes a real value through unchanged', () => {
    expect(requiredValue('Jane')).toBe('Jane')
  })

  it('throws, instead of letting null reach a NOT NULL column', () => {
    expect(() => requiredValue(null)).toThrow('This field is required and cannot be cleared')
  })
})