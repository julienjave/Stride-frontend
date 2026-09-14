import { describe, it, expect } from 'vitest'
import { loginSchema, mfaCodeSchema, registerSchema } from './schemas'

describe('loginSchema', () => {
  it('accepts a valid email and non-empty password', () => {
    const result = loginSchema.safeParse({
      email: 'a@b.com',
      password: 'anything',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'anything',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an empty password', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', password: '' })
    expect(result.success).toBe(false)
  })
})

describe('mfaCodeSchema', () => {
  it('accepts exactly 6 digits', () => {
    expect(mfaCodeSchema.safeParse({ code: '482913' }).success).toBe(true)
  })

  it('rejects fewer than 6 digits', () => {
    expect(mfaCodeSchema.safeParse({ code: '1234' }).success).toBe(false)
  })

  it('rejects non-numeric characters', () => {
    expect(mfaCodeSchema.safeParse({ code: 'abcdef' }).success).toBe(false)
  })
})

describe('registerSchema', () => {
  const validBase = {
    email: 'a@b.com',
    password: 'password123',
    confirmPassword: 'password123',
    firstName: 'Jane',
    lastName: 'Doe',
    dateOfBirth: '1990-01-01',
  }

  it('accepts a fully valid registration', () => {
    expect(registerSchema.safeParse(validBase).success).toBe(true)
  })

  it('rejects when password and confirmPassword differ', () => {
    const result = registerSchema.safeParse({
      ...validBase,
      confirmPassword: 'somethingElse',
    })
    expect(result.success).toBe(false)
    // Confirms the error attaches to the RIGHT field (path: ['confirmPassword']
    // in the schema) — not just that validation failed somewhere.
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['confirmPassword'])
    }
  })

  it('rejects a password shorter than 8 characters', () => {
    const result = registerSchema.safeParse({
      ...validBase,
      password: 'short',
      confirmPassword: 'short',
    })
    expect(result.success).toBe(false)
  })

  it('accepts registration without phone or address (both optional)', () => {
    // validBase already has neither — this test exists to make that
    // omission an intentional, asserted behavior rather than an
    // unexamined side effect of validBase's shape.
    expect(registerSchema.safeParse(validBase).success).toBe(true)
  })

  it('accepts registration with phone and address provided', () => {
    const result = registerSchema.safeParse({
      ...validBase,
      phone: '+1 555-0100',
      address: '123 Main St, Springfield',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a phone number over 50 characters', () => {
    const result = registerSchema.safeParse({
      ...validBase,
      phone: '5'.repeat(51),
    })
    expect(result.success).toBe(false)
  })

  it('rejects an address over 500 characters', () => {
    const result = registerSchema.safeParse({
      ...validBase,
      address: 'a'.repeat(501),
    })
    expect(result.success).toBe(false)
  })
})