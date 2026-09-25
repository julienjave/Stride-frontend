import { describe, it, expect } from 'vitest'
import { formatAddressLines } from './format'
import type { Address } from './types'

// country-state-city is replaced by a two-country fixture in
// src/test-setup.ts (United States, Aland Islands) — hence the choice of
// countries below.

const empty: Address = {
  addressLine1: null,
  addressLine2: null,
  addressCity: null,
  addressState: null,
  addressPostalCode: null,
  addressCountry: null,
}

describe('formatAddressLines', () => {
  it('orders a full address and shows the country NAME, not its code', () => {
    expect(
      formatAddressLines({
        addressLine1: '1 Main St',
        addressLine2: 'Suite 4',
        addressCity: 'Springfield',
        addressState: 'Illinois',
        addressPostalCode: '62704',
        addressCountry: 'US',
      }),
    ).toEqual(['1 Main St', 'Suite 4', '62704 Springfield', 'Illinois', 'United States'])
  })

  it('skips the optional parts instead of leaving blank lines', () => {
    expect(
      formatAddressLines({
        ...empty,
        addressLine1: '1 Storagatan',
        addressCity: 'Mariehamn',
        addressPostalCode: '22100',
        addressCountry: 'AX',
      }),
    ).toEqual(['1 Storagatan', '22100 Mariehamn', 'Aland Islands'])
  })

  it('returns no lines at all for an empty address', () => {
    expect(formatAddressLines(empty)).toEqual([])
  })

  it('falls back to the raw code for a country it does not know', () => {
    expect(formatAddressLines({ ...empty, addressCountry: 'ZZ' })).toEqual(['ZZ'])
  })
})