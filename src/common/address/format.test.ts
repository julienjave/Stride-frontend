/*
    Copyright 2026 Julien Javelaud

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
// -----------------------------------------------------------------------------------------------------------

import { describe, it, expect } from 'vitest'
import { formatAddressLines } from './format'
import type { Address } from './types'

// the address data is replaced by a two-country fixture in
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