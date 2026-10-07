import { describe, it, expect } from 'vitest'
import { loginSchema, mfaCodeSchema } from './schemas'

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