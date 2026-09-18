import { describe, it, expect } from 'vitest'
import { addressSchema } from './schemas'

const fullAddress = {
  addressLine1: '1 Acme Way',
  addressLine2: 'Suite 200',
  addressCity: 'Springfield',
  addressState: 'IL',
  addressPostalCode: '62704',
  addressCountry: 'US',
}

describe('addressSchema — optional as a whole unit', () => {
  it('passes when every field is empty', () => {
    const result = addressSchema.safeParse({
      addressLine1: '',
      addressLine2: '',
      addressCity: '',
      addressState: '',
      addressPostalCode: '',
      addressCountry: '',
    })

    expect(result.success).toBe(true)
  })
})

describe('addressSchema — a complete address', () => {
  it('passes with every field filled in', () => {
    expect(addressSchema.safeParse(fullAddress).success).toBe(true)
  })

  it('passes without the optional line2/state', () => {
    const { addressLine2: _l2, addressState: _s, ...withoutOptional } = fullAddress
    expect(addressSchema.safeParse(withoutOptional).success).toBe(true)
  })
})

describe('addressSchema — core fields required together', () => {
  it('fails when only city is given, naming exactly the three missing core fields', () => {
    const result = addressSchema.safeParse({
      addressLine1: '',
      addressCity: 'Springfield',
      addressPostalCode: '',
      addressCountry: '',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path[0]).sort()
      expect(paths).toEqual(['addressCountry', 'addressLine1', 'addressPostalCode'])
    }
  })

  // Regression coverage for the exact bug already found once with
  // licenseNumberSchema this session: a base-schema check that ALSO
  // happens to reject '' would fire ALONGSIDE superRefine's own
  // "required" message, showing the person two errors for one problem.
  it('shows exactly ONE error for a blank country, not two', () => {
    const result = addressSchema.safeParse({
      ...fullAddress,
      addressCountry: '',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const countryIssues = result.error.issues.filter(
        (issue) => issue.path[0] === 'addressCountry',
      )
      expect(countryIssues).toHaveLength(1)
      expect(countryIssues[0].message).toBe('Country is required')
    }
  })

  it('rejects a country code of the wrong length, with a format-specific message', () => {
    const result = addressSchema.safeParse({ ...fullAddress, addressCountry: 'USA' })

    expect(result.success).toBe(false)
    if (!result.success) {
      const countryIssues = result.error.issues.filter(
        (issue) => issue.path[0] === 'addressCountry',
      )
      expect(countryIssues).toHaveLength(1)
      expect(countryIssues[0].message).toBe('Select a valid country')
    }
  })
})