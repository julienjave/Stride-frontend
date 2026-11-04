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
import { ApiError } from '@/api/client'
import {
  adminDuplicateMatches,
  duplicateElsewhereText,
  goAheadLabel,
  practitionerDuplicateWarning,
} from './possibleDuplicate'

// Reading the possible-duplicate 409 (decisions §27, pass 2). The pages'
// tests show the warning; these pin the edges of telling it apart from
// every other answer.
function apiError(statusCode: number, extra: Record<string, unknown>) {
  return new ApiError({
    statusCode,
    message: ['A patient with this name and date of birth may already be in Stride.'],
    error: 'ConflictException',
    timestamp: '2031-01-01T00:00:00.000Z',
    path: '/users',
    ...extra,
  })
}

const row = {
  id: 7,
  firstName: 'Marie',
  lastName: 'Martin',
  avatarUrl: null,
  dateOfBirth: '1985-04-12',
  sharedClinics: [{ id: 1, name: 'Riverside Physio' }],
  onMyCareTeam: false,
}

describe('practitionerDuplicateWarning', () => {
  it('reads the rows and the "elsewhere" flag of the warning', () => {
    expect(
      practitionerDuplicateWarning(
        apiError(409, { reason: 'possible_duplicate', inYourClinics: [row], elsewhere: true }),
      ),
    ).toStrictEqual({ inYourClinics: [row], elsewhere: true })
  })

  // Only the reason makes it a warning: the route's other 409 (an email
  // already taken) has none.
  it('is null for a 409 without the reason, another status, or no answer at all', () => {
    expect(practitionerDuplicateWarning(apiError(409, {}))).toBeNull()
    expect(
      practitionerDuplicateWarning(apiError(400, { reason: 'possible_duplicate' })),
    ).toBeNull()
    expect(practitionerDuplicateWarning(new TypeError('Failed to fetch'))).toBeNull()
    expect(practitionerDuplicateWarning(null)).toBeNull()
  })

  // A field of the wrong shape reads as "nothing to show" there.
  it('reads missing or malformed fields as nothing', () => {
    expect(
      practitionerDuplicateWarning(
        apiError(409, { reason: 'possible_duplicate', inYourClinics: 'x', elsewhere: 'yes' }),
      ),
    ).toStrictEqual({ inYourClinics: [], elsewhere: false })
  })
})

describe('adminDuplicateMatches', () => {
  const match = { id: 12, firstName: 'Jo', lastName: 'Ng', isActive: false, clinics: [] }

  it('reads the matches of the warning', () => {
    expect(
      adminDuplicateMatches(apiError(409, { reason: 'possible_duplicate', matches: [match] })),
    ).toStrictEqual([match])
  })

  it('is null for any other answer, and empty for a malformed list', () => {
    expect(adminDuplicateMatches(apiError(409, { matches: [match] }))).toBeNull()
    expect(adminDuplicateMatches(apiError(409, { reason: 'possible_duplicate' }))).toStrictEqual(
      [],
    )
  })
})

describe('the words', () => {
  it('says "also" only when matches from my clinics are listed', () => {
    expect(duplicateElsewhereText(true)).toBe(
      "There is also a match you can't see: it's at a clinic you don't work at, or it has been deactivated. Check with an admin before inviting — they can give you access to it, or reactivate it.",
    )
    expect(duplicateElsewhereText(false)).toBe(
      "You can't see the existing account: it's at a clinic you don't work at, or it has been deactivated. Check with an admin before inviting — they can give you access to it, or reactivate it.",
    )
  })

  it('names the person on the go-ahead button', () => {
    expect(goAheadLabel('Create', 'Jo', 'Ng')).toBe('Create Jo Ng anyway')
  })
})